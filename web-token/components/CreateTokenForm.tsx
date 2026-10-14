/**
 * Create Token Form Component
 * 
 * Form to create a new RWA token with compliance settings
 */

'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { TOKEN_CLONE_FACTORY_ADDRESS, TOKEN_CLONE_FACTORY_ABI } from '@/lib/contracts/TokenCloneFactory';
import { COMPLIANCE_AGGREGATOR_ADDRESS } from '@/lib/contracts/compliance';
import { IDENTITY_REGISTRY_ADDRESS, TRUSTED_ISSUERS_REGISTRY_ADDRESS } from '@/lib/contracts/registries';
import { INVESTMENT_CLAIMS, CLAIM_DESCRIPTIONS } from '@/types/token';

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
      console.log('🏭 Creating token with factory...');
      
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not available');
      }

      // Create provider with explicit network config to avoid ENS resolution on local networks
      // Get chain ID from MetaMask first to configure network properly
      let chainId: number;
      try {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' }) as string;
        chainId = Number(BigInt(chainIdHex));
      } catch {
        // Fallback to default if chainId retrieval fails
        chainId = 81234; // Besu network default
      }

      // Create network object - explicitly disable ENS to avoid errors on local networks
      // Omit ensAddress to prevent ENS resolution on local networks
      const network: ethers.Networkish = {
        chainId: chainId,
        name: 'besu',
        // Don't set ensAddress - ethers.js will not try to resolve ENS if it's not set
      };

      // Create provider with network config to prevent ENS resolution
      // Wrap in try-catch in case ENS error still occurs during provider creation
      let provider: ethers.BrowserProvider;
      let signer: ethers.JsonRpcSigner;
      
      try {
        provider = new ethers.BrowserProvider(window.ethereum, network);
        signer = await provider.getSigner();
      } catch (ensError: unknown) {
        // If ENS error still occurs (shouldn't happen with ensAddress: null, but just in case)
        const ensErrorMessage = (ensError instanceof Error ? ensError.message : String(ensError)) || '';
        const isEnsError = ensErrorMessage.includes('ENS') || 
          (typeof ensError === 'object' && ensError !== null && 'code' in ensError && ensError.code === 'UNSUPPORTED_OPERATION');
        
        if (isEnsError) {
          console.warn('⚠️ ENS error detected, creating provider without network config:', ensError);
          // Fallback: create provider without network config
          // This may still trigger ENS errors, but we'll handle them in the main catch block
          provider = new ethers.BrowserProvider(window.ethereum);
          signer = await provider.getSigner();
        } else {
          throw ensError;
        }
      }
      
      const factory = new ethers.Contract(
        TOKEN_CLONE_FACTORY_ADDRESS,
        TOKEN_CLONE_FACTORY_ABI,
        signer
      );

      // Use createTokenWithRegistries to configure IdentityRegistry and TrustedIssuersRegistry
      // For ClaimTopicsRegistry, we'll set it to address(0) for now (can be configured later per token)
      console.log('📋 Creating token with registries...');
      console.log('  Identity Registry:', IDENTITY_REGISTRY_ADDRESS);
      console.log('  Trusted Issuers Registry:', TRUSTED_ISSUERS_REGISTRY_ADDRESS);
      console.log('  Initial Supply (maxTotalSupply):', initialSupply);
      
      // Convert initial supply to wei using decimals
      const maxTotalSupply = ethers.parseUnits(initialSupply, parseInt(decimals));
      console.log('  Max Total Supply (in wei):', maxTotalSupply.toString());
      
      const tx = await factory.createTokenWithRegistries(
        name,
        symbol,
        parseInt(decimals),
        userAddress,
        maxTotalSupply,                   // Max Total Supply (all tokens will be minted to admin)
        IDENTITY_REGISTRY_ADDRESS,        // Identity Registry
        TRUSTED_ISSUERS_REGISTRY_ADDRESS, // Trusted Issuers Registry
        '0x0000000000000000000000000000000000000000' // Claim Topics Registry (to be configured later)
      );
      
      console.log('📝 Transaction sent:', tx.hash);
      setCurrentStep('Waiting for confirmation...');
      // After creating the token, fetch and log the admin's token balance
    
      const receipt = await tx.wait();
      console.log('✅ Token created! Receipt:', receipt);
      console.log('📊 Total logs in receipt:', receipt?.logs?.length || 0);
      
      // Method 1: Try to get token address from event logs
      let tokenAddress: string | null = null;
      
      if (receipt && receipt.logs) {
        console.log('🔍 Searching for TokenCreated event in logs...');
        
        for (let i = 0; i < receipt.logs.length; i++) {
          const log = receipt.logs[i];
          console.log(`Log ${i}:`, {
            address: log.address,
            topics: log.topics,
            data: log.data
          });
          
          try {
            // Try to parse the log
            const parsed = factory.interface.parseLog({
              topics: [...log.topics],
              data: log.data,
            });
            
            console.log(`✅ Parsed log ${i}:`, parsed?.name, parsed?.args);
            
            if (parsed && parsed.name === 'TokenCreated') {
              tokenAddress = parsed.args.token;
              console.log('🎉 Token address found from event:', tokenAddress);
              break;
            }
          } catch (error) {
            // This log is not from our contract or not a TokenCreated event
            console.log(`⚠️ Could not parse log ${i}:`, error);
            continue;
          }
        }
      }

      // Method 2: If not found in logs, query the contract directly
      if (!tokenAddress) {
        console.log('⚠️ Event not found in logs, trying to query contract...');
        try {
          const totalTokens = await factory.getTotalTokens();
          console.log('Total tokens in factory:', totalTokens.toString());
          
          if (totalTokens > 0) {
            // Get the last token created (most recent)
            const lastIndex = Number(totalTokens) - 1;
            tokenAddress = await factory.getTokenAt(lastIndex);
            console.log('🎉 Token address from contract query:', tokenAddress);
          }
        } catch (queryError) {
          console.error('❌ Failed to query contract:', queryError);
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
          console.log(`💰 BALANCE for user (${userAddress}): ${formatBalance} ${tokenSymbol}`);
        } else {
          console.log('⚠️ Could not determine the created token address to fetch balance.');
        }
      } catch (err) {
        console.error('❌ Error fetching admin balance after creation:', err);
      }

      if (!tokenAddress) {
        throw new Error('Could not retrieve token address. Please check the transaction on the block explorer.');
      }

      console.log('✅ Token created with registries configured:');
      console.log('  Identity Registry:', IDENTITY_REGISTRY_ADDRESS);
      console.log('  Trusted Issuers Registry:', TRUSTED_ISSUERS_REGISTRY_ADDRESS);

      // Step 2: Configure ClaimTopicsRegistry for this token (if claims are selected)
      // Note: ClaimTopicsRegistry needs to be created and configured manually per token
      if (selectedClaims.length > 0) {
        try {
          setCurrentStep('Creating ClaimTopicsRegistry for token...');
          console.log('📋 Creating ClaimTopicsRegistry with selected claims...');
          
          // For now, we'll set the registry to address(0) and configure it manually later
          // In a full implementation, you would deploy a new ClaimTopicsRegistry here
          // or use a factory to create one
          
          // Note: This requires deploying a ClaimTopicsRegistry contract
          // which is not implemented in the web app yet.
          // The token admin will need to create and configure it manually.
          
          console.log('⚠️ ClaimTopicsRegistry will need to be configured manually after creation');
          console.log('   Selected claims:', selectedClaims.join(', '));
          console.log('   The token admin should:');
          console.log('   1. Deploy a ClaimTopicsRegistry');
          console.log('   2. Add claim topics:', selectedClaims.join(', '));
          console.log('   3. Call token.setClaimTopicsRegistry(registryAddress)');
          
          setCurrentStep('');
        } catch (claimTopicsError) {
          console.warn('⚠️ Could not create ClaimTopicsRegistry:', claimTopicsError);
          console.warn('Token was created successfully. Configure ClaimTopicsRegistry manually.');
          setCurrentStep('');
        }
      }

      // Note: All tokens are automatically minted to admin during initialization
      // No need to mint separately anymore

      // Step 4: Set compliance (if selected)
      let complianceAddress = '';
      if (addCompliance) {
        try {
          setCurrentStep('Setting compliance contract...');
          console.log('🔒 Setting compliance aggregator...');
          
          const { TOKEN_CLONEABLE_ABI } = await import('@/lib/contracts/TokenCloneable');
          const tokenContract = new ethers.Contract(
            tokenAddress,
            TOKEN_CLONEABLE_ABI,
            signer
          );

          // Check if the function exists and user has permission
          console.log('Checking if addComplianceModule is available...');
          
          const complianceTx = await tokenContract.addComplianceModule(COMPLIANCE_AGGREGATOR_ADDRESS);
          console.log('📝 Compliance transaction sent:', complianceTx.hash);
          
          setCurrentStep('Waiting for compliance confirmation...');
          await complianceTx.wait();
          console.log('✅ Compliance module added!');
          
          complianceAddress = COMPLIANCE_AGGREGATOR_ADDRESS;
        } catch (complianceError) {
          console.warn('⚠️ Failed to add compliance module (this is optional):', complianceError);
          console.warn('Token was created successfully, but compliance was not added.');
          console.warn('You can add it manually later using the button in the token card.');
          // Don't throw - token was created successfully
          complianceAddress = ''; // Clear compliance address since it wasn't set
        }
      }

      // Step 5: Save to MongoDB
      setCurrentStep('Saving to database...');
      console.log('💾 Saving token to MongoDB...');
      
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
          complianceAddress: complianceAddress || undefined,
          requiredClaims: selectedClaims,
          description,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
        }),
      });

      const saveResult = await saveResponse.json();
      
      console.log('💾 MongoDB save result:', saveResult);

      if (!saveResult.success) {
        console.error('❌ Failed to save to MongoDB:', saveResult);
        throw new Error(`Token created on blockchain but failed to save to database: ${saveResult.message || saveResult.error}`);
      }

      console.log('✅ Token saved to MongoDB successfully!');
      
      const registriesMessage = `\n✓ Identity Registry configured\n✓ Trusted Issuers Registry configured`;
      
      const complianceMessage = complianceAddress 
        ? '\n✓ Compliance aggregator set' 
        : addCompliance 
          ? '\n⚠ Compliance not set (optional feature)'
          : '';
      
      const mintMessage = `\n✓ Initial supply automatically minted: ${initialSupply} ${symbol} (all tokens minted to admin)`;
      
      const claimTopicsMessage = selectedClaims.length > 0
        ? `\n⚠ ClaimTopicsRegistry: Configure manually with topics: ${selectedClaims.join(', ')}`
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
      console.error('Error creating token:', err);
      
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
        console.warn('⚠️ ENS not supported on local network (this is expected):', errorMessage);
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
              console.warn('Could not decode error data:', decodeErr);
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
        console.error('Detailed error information:', {
          code: err.code,
          message: err.message,
          reason: err.reason,
          data: err.data,
          error: err.error
        });
      } else {
        console.error('Error is not an object:', err);
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

