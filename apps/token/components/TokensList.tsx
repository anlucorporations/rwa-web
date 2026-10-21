/**
 * Tokens List Component
 * 
 * Displays all created tokens with their information
 */

'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { formatEther, formatUnits, isAddress, parseEther, type Address } from 'viem';
import { TokenCloneableAbi } from '@rwa/shared/contracts';
import { getPublicClient } from '@rwa/shared/web3';
import { Token } from '@/types/token';
import { CLAIM_DESCRIPTIONS } from '@/types/token';
import { TOKEN_CLONE_FACTORY_ADDRESS } from '@/lib/contracts';
import { TOKEN_MARKET_ABI } from '@/lib/contracts/market';
import { useTokensQuery } from '@/lib/queries';
import { useToast } from '@rwa/ui';

/** Texto/código de un error desconocido (sin `any`). */
function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
function errorCode(err: unknown): string | number | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    return (err as { code?: string | number }).code;
  }
  return undefined;
}
function errorReason(err: unknown): string {
  if (err && typeof err === 'object' && 'reason' in err) {
    return String((err as { reason?: unknown }).reason ?? '');
  }
  return '';
}

interface TokensListProps {
  adminAddress?: string;
  onSelectToken?: (token: Token) => void;
  refreshTrigger?: number;
}

export default function TokensList({ adminAddress, onSelectToken, refreshTrigger }: TokensListProps) {
  const toast = useToast();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const {
    data: tokens = [],
    isLoading: loading,
    error: tokensError,
    refetch,
  } = useTokensQuery(adminAddress, refreshTrigger);
  const [error, setError] = useState<string | null>(null);
  const [addingCompliance, setAddingCompliance] = useState<string | null>(null); // tokenId being updated
  const [removingCompliance, setRemovingCompliance] = useState<string | null>(null);
  const [removingClaim, setRemovingClaim] = useState<string | null>(null); // tokenId_claimTopic
  const [editingPrice, setEditingPrice] = useState<string | null>(null); // tokenId being edited
  const [newPrice, setNewPrice] = useState<string>('');
  const [adminBalances, setAdminBalances] = useState<Record<string, { balance: string; symbol: string }>>({});
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (tokens.length > 0 && adminAddress) {
      loadAdminBalances();
      loadTokenPrices();
    }
  }, [tokens, adminAddress]);

  const loadAdminBalances = async () => {
    if (!adminAddress) {
      return;
    }

    try {
      const client = getPublicClient();

      const balances: Record<string, { balance: string; symbol: string }> = {};

      for (const token of tokens) {
        if (!token.tokenAddress || !token.adminAddress) continue;

        try {
          const [balance, decimals, symbol] = await Promise.all([
            client.readContract({
              address: token.tokenAddress as Address,
              abi: TokenCloneableAbi,
              functionName: 'balanceOf',
              args: [token.adminAddress as Address],
            }),
            client.readContract({
              address: token.tokenAddress as Address,
              abi: TokenCloneableAbi,
              functionName: 'decimals',
            }),
            client.readContract({
              address: token.tokenAddress as Address,
              abi: TokenCloneableAbi,
              functionName: 'symbol',
            }),
          ]);

          const formattedBalance = formatUnits(balance, Number(decimals));
          // Format balance respecting token decimals
          // Show up to the number of decimals the token has, but at least 4 decimal places
          const tokenDecimals = Number(decimals) || 18; // Default to 18 if invalid
          const decimalsToShow = Math.max(4, tokenDecimals);
          const balanceNum = parseFloat(formattedBalance);

          // Format with appropriate decimals, removing trailing zeros but keeping at least one decimal if needed
          const formattedBalanceWithDecimals = (isNaN(balanceNum) || !isFinite(balanceNum)
            ? '0'
            : balanceNum.toFixed(decimalsToShow).replace(/\.?0+$/, '') || '0');

          balances[token._id || token.tokenAddress] = {
            balance: formattedBalanceWithDecimals,
            symbol,
          };
        } catch {
          balances[token._id || token.tokenAddress] = {
            balance: 'Error',
            symbol: token.symbol || 'N/A',
          };
        }
      }

      setAdminBalances(balances);
    } catch {
      // Sin RPC disponible se dejan los saldos sin cargar
    }
  };

  const loadTokenPrices = async () => {
    if (tokens.length === 0) {
      return;
    }

    try {
      const client = getPublicClient();
      const prices: Record<string, number> = {};

      for (const token of tokens) {
        if (!token.tokenAddress) continue;

        try {
          // Get price from contract (stored as wei per unit)
          const priceWeiPerUnit = await client.readContract({
            address: token.tokenAddress as Address,
            abi: TOKEN_MARKET_ABI,
            functionName: 'pricePerToken',
          });
          // Convert to wei per token by multiplying by decimals
          const tokenUnitsPerToken = BigInt(10) ** BigInt(token.decimals);
          const priceWeiPerToken = priceWeiPerUnit * tokenUnitsPerToken;
          // Convert from wei to ETH
          const priceEth = parseFloat(formatEther(priceWeiPerToken));

          prices[token._id || ''] = priceEth;
        } catch {
          // Si el token no expone el precio, se omite
        }
      }

      setTokenPrices(prices);
    } catch {
      // Sin RPC disponible se dejan los precios sin cargar
    }
  };

  const getClaimBadges = (claimTopics: number[]) => {
    return claimTopics.map((topic) => ({
      topic,
      name: CLAIM_DESCRIPTIONS[topic]?.name || `Claim ${topic}`,
    }));
  };

  const addComplianceToToken = async (token: Token, moduleAddress: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click

    if (!token._id) {
      setError('Token ID not available');
      return;
    }

    // Ask user for module address if not provided
    let complianceModule = moduleAddress;
    if (!complianceModule) {
      complianceModule = prompt('Enter compliance module address:') || '';
      if (!complianceModule) {
        return;
      }
    }

    try {
      setAddingCompliance(token._id);
      setError(null);

      if (!walletClient || !address) {
        throw new Error('MetaMask not available');
      }
      if (!isAddress(complianceModule)) {
        throw new Error('Invalid compliance module address');
      }

      // Verify we're the admin
      if (address.toLowerCase() !== token.adminAddress.toLowerCase()) {
        throw new Error('Only the token admin can add compliance modules');
      }

      // Call addComplianceModule on token contract
      const hash = await walletClient.writeContract({
        address: token.tokenAddress as Address,
        abi: TokenCloneableAbi,
        functionName: 'addComplianceModule',
        args: [complianceModule as Address],
      });

      await getPublicClient().waitForTransactionReceipt({ hash });

      // Update modules array in MongoDB
      const currentModules = token.complianceModules || [];
      const updatedModules = [...currentModules, complianceModule];

      const response = await fetch(`/api/tokens/${token._id}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modules: updatedModules,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to update database');
      }

      setError(null);
      toast.success(`✅ Compliance Module Added!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📦 Module Address:\n${complianceModule}\n\n📊 Total Modules: ${updatedModules.length}\n\n📜 Transaction Hash:\n${hash}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Reload tokens
      await refetch();
    } catch (err) {
      const message = errorText(err);
      let errorMsg = '❌ Failed to Add Compliance Module\n\n';

      if (message.includes('execution reverted') || message.includes('revert')) {
        errorMsg += '⚠️ Transaction Reverted\n\nPossible causes:\n• You are not the token owner/admin\n• Module address is invalid\n• Token doesn\'t support compliance modules\n• Gas estimation failed';
      } else if (message.includes('user rejected') || message.includes('denied')) {
        errorMsg += '🚫 Transaction Cancelled\n\nYou rejected the transaction in MetaMask';
      } else if (message.includes('network')) {
        errorMsg += '🌐 Network Error\n\nPlease check your connection to the blockchain';
      } else {
        errorMsg += message || 'Unknown error occurred';
      }

      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setAddingCompliance(null);
    }
  };

  const removeComplianceFromToken = async (token: Token, moduleAddress: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click

    if (!moduleAddress) {
      setError('Module address not available');
      return;
    }

    const confirmMsg = `⚠️ Remove compliance module from UI?\n\n${moduleAddress}\n\nNOTE: This will ONLY remove the reference from the UI/database.\nThe module will still exist on the blockchain.\n\nThe token contract doesn't support removing modules on-chain.\n\nContinue?`;
    
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      setRemovingCompliance(token._id || '');
      setError(null);

      
      // Just update MongoDB to remove this module from the array
      const currentModules = token.complianceModules || [];
      const updatedModules = currentModules.filter(m => m.toLowerCase() !== moduleAddress.toLowerCase());
      
      const response = await fetch(`/api/tokens/${token._id}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modules: updatedModules,
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update database');
      }
      
            
      setError(null);
      toast.success(`✅ Module Hidden from UI\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📦 Hidden Module:\n${moduleAddress}\n\n📊 Remaining Modules: ${updatedModules.length}\n\n⚠️ Note: Module still exists on blockchain\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Reload tokens
      await refetch();
    } catch (err) {
      const errorMsg = `❌ Failed to Hide Module\n\n⚠️ Database Error\n\n${errorText(err) || 'Failed to remove module'}`;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setRemovingCompliance(null);
    }
  };

  const removeClaimFromToken = async (token: Token, claimTopic: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click

    if (!token._id) {
      setError('Token ID not available');
      return;
    }

    const claimName = getClaimBadges([claimTopic])[0]?.name || `Claim ${claimTopic}`;
    
    if (!confirm(`Remove required claim?\n\n${claimName} (Topic ${claimTopic})\n\nThis will only update the UI/database.\nThe claim requirement may still be enforced on the blockchain.\n\nContinue?`)) {
      return;
    }

    try {
      setRemovingClaim(`${token._id}_${claimTopic}`);
      setError(null);

      
      // Update MongoDB to remove this claim from the array
      const currentClaims = token.requiredClaims || [];
      const updatedClaims = currentClaims.filter(c => c !== claimTopic);
      
      const response = await fetch(`/api/tokens/${token._id}/claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claims: updatedClaims,
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update database');
      }
      
            
      setError(null);
      toast.success(`✅ Claim Removed from UI\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🏷️ Removed: ${claimName}\n📊 Remaining Claims: ${updatedClaims.length}\n\n⚠️ Note: This only updates the UI.\nOn-chain requirements may still be enforced.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Reload tokens
      await refetch();
    } catch (err) {
      const errorMsg = `❌ Failed to Remove Claim\n\n⚠️ Database Error\n\n${errorText(err) || 'Failed to remove claim'}`;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setRemovingClaim(null);
    }
  };

  const updateTokenPrice = async (token: Token, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!token._id) {
      return;
    }

    if (editingPrice === token._id) {
      // Save price - first update contract, then database
      try {
        const priceValue = parseFloat(newPrice);
        if (isNaN(priceValue) || priceValue < 0) {
          toast.error('Invalid price');
          return;
        }

        // Check if wallet is available
        if (!walletClient) {
          throw new Error('MetaMask is not installed.\n\nPlease install MetaMask to set token price.');
        }

        // Step 1: Set price on blockchain contract
        // Convert admin input to wei per unit (not per token)
        // Admin input: "1" = 1 ETH per token
        // Store as: 1 ETH / (10^decimals units per token) = wei per unit
        const pricePerTokenWei = parseEther(priceValue.toString());
        const tokenUnitsPerToken = BigInt(10) ** BigInt(token.decimals);
        const pricePerUnitWei = pricePerTokenWei / tokenUnitsPerToken;

        const hash = await walletClient.writeContract({
          address: token.tokenAddress as Address,
          abi: TOKEN_MARKET_ABI,
          functionName: 'setPrice',
          args: [pricePerUnitWei],
        });
        await getPublicClient().waitForTransactionReceipt({ hash });

        // Step 2: Update price in database
        const response = await fetch(`/api/tokens/${token._id}/price`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            price: priceValue,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Failed to update price in database');
        }


        // Update local price state immediately
        if (token._id) {
          setTokenPrices(prev => ({
            ...prev,
            [token._id || '']: priceValue
          }));
        }

        setError(null);
        toast.success(`✅ Price Updated!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 New Price: ${priceValue} ETH\n📦 Token: ${token.symbol}\n\n📜 Transaction Hash:\n${hash}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        await refetch();
        setEditingPrice(null);
        setNewPrice('');
      } catch (err) {
        const message = errorText(err);
        let errorMsg = '';

        if (message.includes('user rejected') || message.includes('denied') || String(errorCode(err)) === '4001') {
          errorMsg = '🚫 Transaction Cancelled\n\nYou rejected the transaction in MetaMask.';
        } else if (message.includes('execution reverted') || message.includes('revert')) {
          errorMsg = `⚠️ Transaction Reverted\n\n${errorReason(err) || message || 'Contract execution reverted'}\n\n💡 Make sure you are the token admin.`;
        } else {
          errorMsg = `❌ Failed to Update Price\n\n${message || 'Unknown error occurred'}`;
        }

        setError(errorMsg);
        toast.error(errorMsg);
      }
    } else {
      // Start editing
      setEditingPrice(token._id);
      setNewPrice(token.price?.toString() || '0');
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <p className="text-center text-gray-600 dark:text-gray-400">
          Loading tokens...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Created Tokens ({tokens.length})
        </h2>
        <button
          onClick={() => void refetch()}
          className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          🔄 Refresh
        </button>
      </div>

      {(error || tokensError) && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-400">
            {error || tokensError?.message || 'Failed to load tokens'}
          </p>
        </div>
      )}

      {tokens.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">
            No tokens created yet. Create your first RWA token above!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tokens.map((token) => (
            <div
              key={token._id}
              onClick={() => onSelectToken && onSelectToken(token)}
              className={`rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 ${onSelectToken ? 'cursor-pointer' : ''}`}
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {token.name}
                    </h3>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {token.symbol}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {token.decimals} decimals
                    </span>
                    {token.complianceAddress && (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                        ✓ Compliance Set
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Token Address:
                      </p>
                      <code className="block break-all text-xs text-gray-900 dark:text-white">
                        {token.tokenAddress}
                      </code>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Admin:
                      </p>
                      <code className="block break-all text-xs text-gray-900 dark:text-white">
                        {token.adminAddress}
                      </code>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Admin Balance:
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {adminBalances[token._id || token.tokenAddress] ? (
                          <>
                            {adminBalances[token._id || token.tokenAddress].balance} {adminBalances[token._id || token.tokenAddress].symbol}
                          </>
                        ) : (
                          <span className="text-gray-400">Loading...</span>
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Token Factory:
                      </p>
                      <code className="block break-all text-xs text-gray-900 dark:text-white">
                        {TOKEN_CLONE_FACTORY_ADDRESS}
                      </code>
                    </div>
                    
                    {token.complianceModules && token.complianceModules.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Compliance Modules ({token.complianceModules.length}):
                        </p>
                        <div className="mt-1 space-y-1">
                          {token.complianceModules.map((module, idx) => (
                            <div key={module} className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                  #{idx + 1}
                                </span>
                                <code className="break-all text-xs text-gray-900 dark:text-white">
                                  {module}
                                </code>
                              </div>
                              <button
                                onClick={(e) => removeComplianceFromToken(token, module, e)}
                                disabled={removingCompliance === token._id}
                                className="shrink-0 rounded-lg bg-yellow-600 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Remove from UI (module will remain on blockchain)"
                              >
                                {removingCompliance === token._id ? '...' : '👁️‍🗨️'}
                              </button>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          💡 Multiple modules work together for compliance verification
                        </p>
                        <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-500">
                          ⚠️ Note: Modules can only be hidden from UI, not removed from blockchain
                        </p>
                      </div>
                    )}
                    
                    {token.description && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Description:
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {token.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Required Claims */}
              <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Required Claims for Investment ({token.requiredClaims.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {getClaimBadges(token.requiredClaims).map((claim, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 pl-3 pr-1 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                      title={CLAIM_DESCRIPTIONS[claim.topic]?.description}
                    >
                      {claim.name}
                      <button
                        onClick={(e) => removeClaimFromToken(token, claim.topic, e)}
                        disabled={removingClaim === `${token._id}_${claim.topic}`}
                        className="rounded-full p-0.5 text-purple-600 hover:bg-purple-200 hover:text-purple-900 dark:text-purple-400 dark:hover:bg-purple-800 dark:hover:text-purple-200 transition-colors disabled:opacity-50"
                        title="Remove this claim requirement from UI"
                      >
                        {removingClaim === `${token._id}_${claim.topic}` ? '⏳' : '✕'}
                      </button>
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  ⚠️ Removing claims only updates the UI. On-chain requirements may still be enforced.
                </p>
              </div>

              {/* Price */}
              <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Price per Token:
                    </p>
                    {editingPrice === token._id ? (
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newPrice}
                          onChange={(e) => setNewPrice(e.target.value)}
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          placeholder="0.00"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">WEI</span>
                      </div>
                    ) : (
                      <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                        {tokenPrices[token._id || ''] !== undefined 
                          ? `${tokenPrices[token._id || '']} wei` 
                          : token.price !== undefined 
                            ? `${token.price} wei (DB)` 
                            : 'Not set'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => updateTokenPrice(token, e)}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700"
                  >
                    {editingPrice === token._id ? '💾 Save' : '✏️ Edit'}
                  </button>
                </div>
              </div>

              {/* Metadata */}
              <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <span>Decimals: {token.decimals}</span>
                <span>Created: {new Date(token.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Add Compliance Button */}
              <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                  <p className="mb-2 text-xs font-medium text-blue-900 dark:text-blue-300">
                    📦 Manage Compliance
                  </p>
                  <p className="mb-3 text-xs text-blue-800 dark:text-blue-400">
                    {token.complianceModules && token.complianceModules.length > 0
                      ? 'Add more modules to enhance compliance verification'
                      : 'Add compliance modules to enable automated verification'}
                  </p>
                  <button
                    onClick={(e) => addComplianceToToken(token, '', e)}
                    disabled={addingCompliance === token._id}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {addingCompliance === token._id ? 'Adding Module...' : '➕ Add Compliance Module'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

