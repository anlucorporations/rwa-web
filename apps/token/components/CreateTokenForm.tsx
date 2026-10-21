/**
 * Create Token Form Component
 * 
 * Form to create a new RWA token with compliance settings
 */

'use client';

import { useState } from 'react';
import { useChainId, useWalletClient } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { decodeEventLog, parseUnits, type Address } from 'viem';
import { TOKEN_CLONE_FACTORY_ADDRESS } from '@/lib/contracts/TokenCloneFactory';
import { COMPLIANCE_AGGREGATOR_ADDRESS } from '@/lib/contracts/compliance';
import {
  ClaimTopicsRegistryCloneFactoryAbi,
  TokenCloneableAbi,
  TokenCloneFactoryAbi,
  getContractAddress,
} from '@rwa/shared/contracts';
import { IDENTITY_REGISTRY_ADDRESS, TRUSTED_ISSUERS_REGISTRY_ADDRESS } from '@/lib/contracts/registries';
import { INVESTMENT_CLAIMS, CLAIM_DESCRIPTIONS } from '@/types/token';
import { ZERO_ADDRESS, assertCanonicalChain } from '@rwa/shared/network';
import { getPublicClient } from '@rwa/shared/web3';
import { tokenKeys } from '@/lib/queries';
import { useToast } from '@rwa/ui';

interface CreateTokenFormProps {
  userAddress: string;
  onSuccess: () => void;
}

/** Normaliza errores de wagmi/viem (sin depender de los códigos de `ethers`). */
function normalizeWalletError(err: unknown): { message: string; reason?: string; code?: string | number } {
  const candidate = err as {
    shortMessage?: string;
    details?: string;
    message?: string;
    reason?: string;
    code?: string | number;
    cause?: { reason?: string; shortMessage?: string; message?: string; code?: string | number };
  };
  const code = candidate?.code ?? candidate?.cause?.code;
  const message =
    candidate?.shortMessage || candidate?.details || candidate?.message || candidate?.cause?.message || '';
  const reason = candidate?.reason || candidate?.cause?.reason || candidate?.cause?.shortMessage || '';
  return { message, reason, code };
}

export default function CreateTokenForm({ userAddress, onSuccess }: CreateTokenFormProps) {
  const toast = useToast();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState('18');
  const [initialSupply, setInitialSupply] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClaims, setSelectedClaims] = useState<number[]>([
    INVESTMENT_CLAIMS.KYC,
    INVESTMENT_CLAIMS.ACCREDITATION,
    INVESTMENT_CLAIMS.JURISDICTION
  ]);
  const [addCompliance] = useState(false); // Los módulos se añaden después desde la tarjeta del token
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');

  const toggleClaim = (claim: number) => {
    setSelectedClaims(prev =>
      prev.includes(claim)
        ? prev.filter(c => c !== claim)
        : [...prev, claim]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !symbol || !decimals || !initialSupply) {
      setError('Please fill in all required fields');
      return;
    }

    const initialSupplyNum = parseFloat(initialSupply);
    if (isNaN(initialSupplyNum) || initialSupplyNum <= 0) {
      setError('Initial supply must be a positive number');
      return;
    }

    if (selectedClaims.length === 0) {
      setError('Please select at least one required claim for investors');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      
      // Step 1: Create token
      setCurrentStep('Creating token on blockchain...');

      if (!walletClient) {
        throw new Error('MetaMask not available');
      }
      // O2.5: la wallet debe estar en la red canónica (mensaje claro si no)
      assertCanonicalChain(chainId);

      const client = getPublicClient();
      const factoryAddress = TOKEN_CLONE_FACTORY_ADDRESS as Address;

      // Tope de suministro en wei (0 = sin tope, D-022). Se fija tras crear el token.
      const maxSupplyWei = initialSupply ? parseUnits(initialSupply, parseInt(decimals)) : BigInt(0);

      // O2.4: la factoría real tiene 7 argumentos (sin `maxTotalSupply`). El ClaimTopicsRegistry
      // se crea justo después y se asigna con `setClaimTopicsRegistry`.
      const hash = await walletClient.writeContract({
        address: factoryAddress,
        abi: TokenCloneFactoryAbi,
        functionName: 'createTokenWithRegistries',
        args: [
          name,
          symbol,
          parseInt(decimals),
          userAddress as Address,
          IDENTITY_REGISTRY_ADDRESS as Address,
          TRUSTED_ISSUERS_REGISTRY_ADDRESS as Address,
          ZERO_ADDRESS,
        ],
      });

      setCurrentStep('Waiting for confirmation...');
      const receipt = await client.waitForTransactionReceipt({ hash });

      // Method 1: Try to get token address from event logs
      let tokenAddress: string | null = null;

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: TokenCloneFactoryAbi,
            eventName: 'TokenCreated',
            data: log.data,
            topics: log.topics,
          });
          tokenAddress = decoded.args.token;
          break;
        } catch {
          // This log is not a TokenCreated event
          continue;
        }
      }

      // Method 2: If not found in logs, query the contract directly
      if (!tokenAddress) {
        try {
          const totalTokens = await client.readContract({
            address: factoryAddress,
            abi: TokenCloneFactoryAbi,
            functionName: 'getTotalTokens',
          });
          if (totalTokens > BigInt(0)) {
            // Get the last token created (most recent)
            tokenAddress = await client.readContract({
              address: factoryAddress,
              abi: TokenCloneFactoryAbi,
              functionName: 'getTokenAt',
              args: [totalTokens - BigInt(1)],
            });
          }
        } catch {
          // Se informa abajo si no se pudo resolver la dirección
        }
      }

      if (!tokenAddress) {
        throw new Error('Could not retrieve token address. Please check the transaction on the block explorer.');
      }

      const tokenContractAddress = tokenAddress as Address;

      // Step 2 (O2.4): crear el ClaimTopicsRegistry del token y asignarlo. RF-W-11 fail-closed:
      // un token sin claimTopicsRegistry no verifica a nadie.
      if (selectedClaims.length === 0) {
        throw new Error(
          'Selecciona al menos un claim topic: sin ClaimTopicsRegistry el token no verificaría a nadie.',
        );
      }
      setCurrentStep('Creating ClaimTopicsRegistry for token...');
      const registryFactoryAddress = getContractAddress('ClaimTopicsRegistryCloneFactory') as Address;
      const registryHash = await walletClient.writeContract({
        address: registryFactoryAddress,
        abi: ClaimTopicsRegistryCloneFactoryAbi,
        functionName: 'createRegistryForTokenWithTopics',
        args: [userAddress as Address, tokenContractAddress, selectedClaims.map((topic) => BigInt(topic))],
      });
      await client.waitForTransactionReceipt({ hash: registryHash });
      const claimTopicsRegistryAddress = await client.readContract({
        address: registryFactoryAddress,
        abi: ClaimTopicsRegistryCloneFactoryAbi,
        functionName: 'getRegistryForToken',
        args: [tokenContractAddress],
      });
      if (!claimTopicsRegistryAddress || claimTopicsRegistryAddress === ZERO_ADDRESS) {
        throw new Error('No se pudo crear el ClaimTopicsRegistry del token.');
      }

      setCurrentStep('Assigning ClaimTopicsRegistry...');
      const setRegistryHash = await walletClient.writeContract({
        address: tokenContractAddress,
        abi: TokenCloneableAbi,
        functionName: 'setClaimTopicsRegistry',
        args: [claimTopicsRegistryAddress as Address],
      });
      await client.waitForTransactionReceipt({ hash: setRegistryHash });

      // Tope de suministro (opcional; 0 = sin tope, D-022)
      if (maxSupplyWei > BigInt(0)) {
        setCurrentStep('Setting max supply...');
        const supplyHash = await walletClient.writeContract({
          address: tokenContractAddress,
          abi: TokenCloneableAbi,
          functionName: 'setMaxSupply',
          args: [maxSupplyWei],
        });
        await client.waitForTransactionReceipt({ hash: supplyHash });
      }

      // Note: All tokens are automatically minted to admin during initialization
      // No need to mint separately anymore

      // Step 4: Set compliance (if selected)
      let complianceAddress = '';
      if (addCompliance) {
        try {
          setCurrentStep('Setting compliance contract...');

          const complianceHash = await walletClient.writeContract({
            address: tokenContractAddress,
            abi: TokenCloneableAbi,
            functionName: 'addComplianceModule',
            args: [COMPLIANCE_AGGREGATOR_ADDRESS as Address],
          });

          setCurrentStep('Waiting for compliance confirmation...');
          await client.waitForTransactionReceipt({ hash: complianceHash });

          complianceAddress = COMPLIANCE_AGGREGATOR_ADDRESS;
        } catch {
          // Don't throw - token was created successfully
          complianceAddress = ''; // Clear compliance address since it wasn't set
        }
      }

      // Step 5: Save to MongoDB
      setCurrentStep('Saving to database...');
            
      const saveResponse = await fetch('/api/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          symbol,
          decimals: parseInt(decimals),
          tokenAddress,
          adminAddress: userAddress,
          // O2.4: los tres registries reales del token (el esquema los exige NOT NULL)
          identityRegistry: IDENTITY_REGISTRY_ADDRESS,
          trustedIssuersRegistry: TRUSTED_ISSUERS_REGISTRY_ADDRESS,
          claimTopicsRegistry: claimTopicsRegistryAddress,
          complianceAddress: complianceAddress || undefined,
          complianceModules: complianceAddress ? [complianceAddress] : [],
          requiredClaims: selectedClaims,
          description,
          transactionHash: hash,
          blockNumber: Number(receipt.blockNumber),
        }),
      });

      const saveResult = await saveResponse.json();
      
      
      if (!saveResult.success) {
                throw new Error(`Token created on blockchain but failed to save to database: ${saveResult.message || saveResult.error}`);
      }

            
      const registriesMessage = `\n✓ Identity Registry configured\n✓ Trusted Issuers Registry configured`;
      
      const complianceMessage = complianceAddress 
        ? '\n✓ Compliance aggregator set' 
        : addCompliance 
          ? '\n⚠ Compliance not set (optional feature)'
          : '';
      
      const mintMessage = maxSupplyWei > BigInt(0) ? `\n✓ Max supply configured: ${initialSupply} ${symbol}` : '';
      
      const claimTopicsMessage = claimTopicsRegistryAddress
        ? `\n✓ ClaimTopicsRegistry configured with topics: ${selectedClaims.join(', ')}`
        : '';
      
      toast.success(`Token "${name}" created successfully!\nAddress: ${tokenAddress}\n\n${registriesMessage}${complianceMessage}${mintMessage}${claimTopicsMessage}\n\n✓ Saved to MongoDB`);
      
      // Invalida la lista cacheada de tokens (O4.7)
      await queryClient.invalidateQueries({ queryKey: tokenKeys.all });

      // Reset form
      setName('');
      setSymbol('');
      setDecimals('18');
      setInitialSupply('');
      setDescription('');
      setSelectedClaims([
        INVESTMENT_CLAIMS.KYC,
        INVESTMENT_CLAIMS.ACCREDITATION,
        INVESTMENT_CLAIMS.JURISDICTION
      ]);
      setCurrentStep('');
      
      onSuccess();
    } catch (err: unknown) {
      let errorMsg = '❌ Failed to Create Token\n\n';

      const { message: errorMessage, reason: errorReason, code: errorCode } = normalizeWalletError(err);
      const isUserRejection =
        errorCode === 4001 || /user rejected|user denied|action_rejected/i.test(errorMessage);

      if (isUserRejection) {
        errorMsg += '🚫 Transaction Cancelled\n\nYou rejected the transaction in MetaMask';
      } else if (/revert/i.test(errorMessage) || /revert/i.test(errorReason ?? '')) {
        errorMsg += '⚠️ Transaction Reverted\n\n';

        if (errorReason) {
          errorMsg += `Reason: ${errorReason}\n\n`;
        }

        errorMsg += '💡 Common causes:\n';
        errorMsg += ' • Invalid registry addresses\n';
        errorMsg += ' • Registry contracts not deployed\n';
        errorMsg += ' • Registry contracts do not implement required interfaces\n';
        errorMsg += ' • Max total supply is 0 or invalid\n';
        errorMsg += ' • Admin address is invalid\n';
        errorMsg += ' • Contract verification/compliance check failed\n';
        errorMsg += ' • Gas estimation failed';
      } else if (/network|fetch failed|timeout/i.test(errorMessage)) {
        errorMsg += '🌐 Network Error\n\nPlease check your connection to the blockchain';
      } else if (errorMessage) {
        errorMsg += errorMessage;
      } else {
        errorMsg += 'Unknown error occurred. Please check the console for details.';
      }

      setError(errorMsg);
      setCurrentStep('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
        Create RWA Token
      </h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {currentStep && (
        <div className="mb-4 rounded-lg border border-blue-300 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-400">
            {currentStep}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Token Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Token Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Real Estate Token"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        {/* Token Symbol */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Token Symbol *
          </label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="RET"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        {/* Decimals */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Decimals *
          </label>
          <input
            type="number"
            value={decimals}
            onChange={(e) => setDecimals(e.target.value)}
            min="0"
            max="18"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Standard is 18 (like ETH)
          </p>
        </div>

        {/* Initial Supply (Max Total Supply) */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Initial Supply (Max Total Supply) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={initialSupply}
            onChange={(e) => {
              // Allow only numbers and decimal point
              const value = e.target.value.replace(/[^0-9.]/g, '');
              setInitialSupply(value);
            }}
            placeholder="1000000"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Total supply of tokens. All tokens will be automatically minted to your address (admin) upon creation.
            {initialSupply && parseFloat(initialSupply) > 0 && (
              <span className="block mt-1 text-blue-600 dark:text-blue-400">
                Will mint: {initialSupply} {symbol || 'tokens'} to admin address
              </span>
            )}
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe your token and what it represents..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Required Claims Selection */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Required Claims for Investors *
          </label>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            Select which claims investors must have to hold this token
          </p>
          <div className="space-y-2">
            {Object.entries(CLAIM_DESCRIPTIONS).map(([topicNum, claim]) => {
              const topic = parseInt(topicNum);
              return (
                <label
                  key={topic}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={selectedClaims.includes(topic)}
                    onChange={() => toggleClaim(topic)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {claim.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {claim.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
          {selectedClaims.length === 0 && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              At least one claim must be selected
            </p>
          )}
        </div>

        {/* Add Compliance Toggle - Disabled */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            💡 Compliance Modules
          </p>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            You can add compliance modules after creating the token using the &quot;Add Compliance Module&quot; button in the token card.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={creating || selectedClaims.length === 0}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? currentStep || 'Creating...' : 'Create Token'}
        </button>

        {/* Info */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-xs text-blue-800 dark:text-blue-400">
            💡 The token will be created using the clone pattern for gas efficiency. 
            You will be set as the admin of the token.
          </p>
        </div>
      </form>
    </div>
  );
}

