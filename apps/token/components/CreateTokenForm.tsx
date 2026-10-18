/**
 * Create Token Form Component
 * 
 * Form to create a new RWA token with compliance settings
 */

'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
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
import { CANONICAL_CHAIN_ID, ZERO_ADDRESS, assertCanonicalChain } from '@rwa/shared/network';
import { getInjectedEip1193, isInjectedWalletAvailable } from '@rwa/shared/web3';

interface CreateTokenFormProps {
  userAddress: string;
  onSuccess: () => void;
}

export default function CreateTokenForm({ userAddress, onSuccess }: CreateTokenFormProps) {
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
  const [addCompliance, setAddCompliance] = useState(false); // Changed to false by default
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
            
      if (!isInjectedWalletAvailable()) {
        throw new Error('MetaMask not available');
      }
      const eip1193 = await getInjectedEip1193();
      if (!eip1193) {
        throw new Error('No se pudo acceder a la wallet');
      }

      // Create provider with explicit network config to avoid ENS resolution on local networks
      // Get chain ID from MetaMask first to configure network properly
      let chainId: number;
      try {
        const chainIdHex = await eip1193.request({ method: 'eth_chainId' }) as string;
        chainId = Number(BigInt(chainIdHex));
      } catch {
        // Fallback a la red canónica si no se puede leer la wallet
        chainId = CANONICAL_CHAIN_ID;
      }
      // O2.5: la wallet debe estar en la red canónica (mensaje claro si no)
      assertCanonicalChain(chainId);

      // Create network object - explicitly disable ENS to avoid errors on local networks
      // Omit ensAddress to prevent ENS resolution on local networks
      const network: ethers.Networkish = {
        chainId: chainId,
        name: 'rwa-canonical',
        // Don't set ensAddress - ethers.js will not try to resolve ENS if it's not set
      };

      // Create provider with network config to prevent ENS resolution
      // Wrap in try-catch in case ENS error still occurs during provider creation
      let provider: ethers.BrowserProvider;
      let signer: ethers.JsonRpcSigner;
      
      try {
        provider = new ethers.BrowserProvider(eip1193 as ethers.Eip1193Provider, network);
        signer = await provider.getSigner();
      } catch (ensError: unknown) {
        // If ENS error still occurs (shouldn't happen with ensAddress: null, but just in case)
        const ensErrorMessage = (ensError instanceof Error ? ensError.message : String(ensError)) || '';
        const isEnsError = ensErrorMessage.includes('ENS') || 
          (typeof ensError === 'object' && ensError !== null && 'code' in ensError && ensError.code === 'UNSUPPORTED_OPERATION');
        
        if (isEnsError) {
                    // Fallback: create provider without network config
          // This may still trigger ENS errors, but we'll handle them in the main catch block
          provider = new ethers.BrowserProvider(eip1193 as ethers.Eip1193Provider);
          signer = await provider.getSigner();
        } else {
          throw ensError;
        }
      }
      
      const factory = new ethers.Contract(
        TOKEN_CLONE_FACTORY_ADDRESS,
        TokenCloneFactoryAbi,
        signer
      );

      // Use createTokenWithRegistries to configure IdentityRegistry and TrustedIssuersRegistry
      // For ClaimTopicsRegistry, we'll set it to address(0) for now (can be configured later per token)
                              
      // Tope de suministro en wei (0 = sin tope, D-022). Se fija tras crear el token.
      const maxSupplyWei = initialSupply ? ethers.parseUnits(initialSupply, parseInt(decimals)) : BigInt(0);

      // O2.4: la factoría real tiene 7 argumentos (sin `maxTotalSupply`). El ClaimTopicsRegistry
      // se crea justo después y se asigna con `setClaimTopicsRegistry`.
      const tx = await factory.createTokenWithRegistries(
        name,
        symbol,
        parseInt(decimals),
        userAddress,
        IDENTITY_REGISTRY_ADDRESS,
        TRUSTED_ISSUERS_REGISTRY_ADDRESS,
        ZERO_ADDRESS
      );
      
            setCurrentStep('Waiting for confirmation...');
      // After creating the token, fetch and log the admin's token balance
    
      const receipt = await tx.wait();
                  
      // Method 1: Try to get token address from event logs
      let tokenAddress: string | null = null;
      
      if (receipt && receipt.logs) {
                
        for (let i = 0; i < receipt.logs.length; i++) {
          const log = receipt.logs[i];
                    
          try {
            // Try to parse the log
            const parsed = factory.interface.parseLog({
              topics: [...log.topics],
              data: log.data,
            });
            
                        
            if (parsed && parsed.name === 'TokenCreated') {
              tokenAddress = parsed.args.token;
                            break;
            }
          } catch (error) {
            // This log is not from our contract or not a TokenCreated event
                        continue;
          }
        }
      }

      // Method 2: If not found in logs, query the contract directly
      if (!tokenAddress) {
                try {
          const totalTokens = await factory.getTotalTokens();
                    
          if (totalTokens > 0) {
            // Get the last token created (most recent)
            const lastIndex = Number(totalTokens) - 1;
            tokenAddress = await factory.getTokenAt(lastIndex);
                      }
        } catch (queryError) {
                  }
      }

      // Try to fetch admin balance after getting token address
      try {
        if (tokenAddress) {
          // The ABI for the new token: just enough to call balanceOf
          const MIN_ERC20_ABI = [
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)"
          ];
          const tokenContract = new ethers.Contract(tokenAddress, MIN_ERC20_ABI, signer);
          // Query the balance and symbol
          const balance = await tokenContract.balanceOf(userAddress);
          const tokenDecimals = await tokenContract.decimals();
          const tokenSymbol = await tokenContract.symbol();
          const formatBalance = ethers.formatUnits(balance, tokenDecimals);
                  } else {
                  }
      } catch (err) {
              }

      if (!tokenAddress) {
        throw new Error('Could not retrieve token address. Please check the transaction on the block explorer.');
      }

                  
      // Step 2 (O2.4): crear el ClaimTopicsRegistry del token y asignarlo. RF-W-11 fail-closed:
      // un token sin claimTopicsRegistry no verifica a nadie.
      if (selectedClaims.length === 0) {
        throw new Error(
          'Selecciona al menos un claim topic: sin ClaimTopicsRegistry el token no verificaría a nadie.',
        );
      }
      setCurrentStep('Creating ClaimTopicsRegistry for token...');
      const registryFactory = new ethers.Contract(
        getContractAddress('ClaimTopicsRegistryCloneFactory'),
        ClaimTopicsRegistryCloneFactoryAbi,
        signer,
      );
      const registryTx = await registryFactory.createRegistryForTokenWithTopics(
        userAddress,
        tokenAddress,
        selectedClaims.map((topic) => BigInt(topic)),
      );
      await registryTx.wait();
      const claimTopicsRegistryAddress = String(await registryFactory.getRegistryForToken(tokenAddress));
      if (!claimTopicsRegistryAddress || claimTopicsRegistryAddress === ZERO_ADDRESS) {
        throw new Error('No se pudo crear el ClaimTopicsRegistry del token.');
      }

      const tokenContract = new ethers.Contract(tokenAddress, TokenCloneableAbi, signer);
      setCurrentStep('Assigning ClaimTopicsRegistry...');
      const setRegistryTx = await tokenContract.setClaimTopicsRegistry(claimTopicsRegistryAddress);
      await setRegistryTx.wait();

      // Tope de suministro (opcional; 0 = sin tope, D-022)
      if (maxSupplyWei > BigInt(0)) {
        setCurrentStep('Setting max supply...');
        const supplyTx = await tokenContract.setMaxSupply(maxSupplyWei);
        await supplyTx.wait();
      }

      // Note: All tokens are automatically minted to admin during initialization
      // No need to mint separately anymore

      // Step 4: Set compliance (if selected)
      let complianceAddress = '';
      if (addCompliance) {
        try {
          setCurrentStep('Setting compliance contract...');
                    
          // `tokenContract` (TokenCloneableAbi) ya se creó al asignar el ClaimTopicsRegistry
          const complianceTx = await tokenContract.addComplianceModule(COMPLIANCE_AGGREGATOR_ADDRESS);
                    
          setCurrentStep('Waiting for compliance confirmation...');
          await complianceTx.wait();
                    
          complianceAddress = COMPLIANCE_AGGREGATOR_ADDRESS;
        } catch (complianceError) {
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
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
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
      
      alert(`Token "${name}" created successfully!\nAddress: ${tokenAddress}\n\n${registriesMessage}${complianceMessage}${mintMessage}${claimTopicsMessage}\n\n✓ Saved to MongoDB`);
      
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
      
      // Type guard helper
      const isErrorWithCode = (e: unknown): e is { code?: string; message?: string; reason?: string; data?: unknown; error?: unknown } => {
        return typeof e === 'object' && e !== null;
      };
      
      const errorObj = isErrorWithCode(err) ? err : {};
      const errorMessage = errorObj.message || (err instanceof Error ? err.message : '');
      const errorCode = errorObj.code;
      const errorReason = errorObj.reason;
      
      // Handle ethers.js specific errors
      if (errorCode === 'UNSUPPORTED_OPERATION' && errorMessage.includes('ENS')) {
        // Ignore ENS errors on local networks - this is not a real error
        // Just log it and continue with the actual error if there is one
                // Don't show this as an error to the user - it's expected on local networks
        // Reset state and return silently
        setCreating(false);
        setCurrentStep('');
        return;
      } else if (errorCode === 'ACTION_REJECTED' || errorMessage.includes('user rejected')) {
        errorMsg += '🚫 Transaction Cancelled\n\nYou rejected the transaction in MetaMask';
      } else if (errorCode === 'CALL_EXCEPTION' || errorMessage.includes('execution reverted')) {
        errorMsg += '⚠️ Transaction Reverted\n\n';
        
        // Try to extract revert reason
        let revertReason = '';
        if (errorReason) {
          revertReason = errorReason;
        } else if (errorObj.error && typeof errorObj.error === 'object' && 'message' in errorObj.error) {
          revertReason = String(errorObj.error.message);
        } else if (errorObj.data && typeof errorObj.data === 'object' && 'message' in errorObj.data) {
          revertReason = String(errorObj.data.message);
        } else if (errorObj.error && typeof errorObj.error === 'object' && 'data' in errorObj.error) {
          const errorData = errorObj.error.data;
          if (errorData && typeof errorData === 'object' && 'message' in errorData) {
            revertReason = String(errorData.message);
          } else if (typeof errorData === 'string') {
            // Try to decode error data
            try {
              const { AbiCoder } = await import('ethers');
              const abiCoder = AbiCoder.defaultAbiCoder();
              revertReason = abiCoder.decode(['string'], errorData)[0];
            } catch (decodeErr) {
                          }
          }
        }
        
        if (revertReason) {
          errorMsg += `Reason: ${revertReason}\n\n`;
        }
        
        errorMsg += '💡 Common causes:\n';
        errorMsg += ' • Invalid registry addresses\n';
        errorMsg += ' • Registry contracts not deployed\n';
        errorMsg += ' • Registry contracts do not implement required interfaces\n';
        errorMsg += ' • Max total supply is 0 or invalid\n';
        errorMsg += ' • Admin address is invalid\n';
        errorMsg += ' • Contract verification/compliance check failed\n';
        errorMsg += ' • Gas estimation failed';
      } else if (errorCode === 'NETWORK_ERROR' || errorMessage.includes('network')) {
        errorMsg += '🌐 Network Error\n\nPlease check your connection to the blockchain';
      } else if (errorMessage) {
        errorMsg += errorMessage;
      } else {
        errorMsg += 'Unknown error occurred. Please check the console for details.';
      }
      
      // Log detailed error information for debugging
      if (isErrorWithCode(err)) {
              } else {
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

