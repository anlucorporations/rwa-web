'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import {
  decodeErrorResult,
  formatEther,
  formatUnits,
  isAddress,
  parseUnits,
  type Address,
} from 'viem';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Token } from '@/types/token';
import { CLAIM_DESCRIPTIONS } from '@/types/token';
import { TOKEN_CLONE_FACTORY_ADDRESS } from '@/lib/contracts';
import { TOKEN_MARKET_ABI } from '@/lib/contracts/market';
import { useTokensQuery } from '@/lib/queries';
import { ZERO_ADDRESS } from '@rwa/shared/network';
import { getInjectedEip1193, getPublicClient, isInjectedWalletAvailable } from '@rwa/shared/web3';
import {
  ClaimTopicsRegistryAbi,
  IComplianceAbi,
  IdentityCloneableAbi,
  IdentityRegistryAbi,
  TokenCloneableAbi,
  TrustedIssuersRegistryAbi,
} from '@rwa/shared/contracts';

/** Normaliza errores de wagmi/viem (sin depender de los códigos de `ethers`). */
function normalizeMarketError(err: unknown): {
  message: string;
  reason?: string;
  code?: string | number;
  data?: string;
} {
  const candidate = err as {
    shortMessage?: string;
    details?: string;
    message?: string;
    reason?: string;
    code?: string | number;
    data?: unknown;
    cause?: { reason?: string; shortMessage?: string; message?: string; code?: string | number; data?: unknown };
  };
  const code = candidate?.code ?? candidate?.cause?.code;
  const message =
    candidate?.shortMessage || candidate?.details || candidate?.message || candidate?.cause?.message || '';
  const reason = candidate?.reason || candidate?.cause?.reason || '';
  const rawData = candidate?.data ?? candidate?.cause?.data;
  return {
    message,
    reason,
    code,
    data: typeof rawData === 'string' && rawData.startsWith('0x') ? rawData : undefined,
  };
}

export default function MarketplacePage() {
  const { address: wagmiAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const {
    data: tokens = [],
    isLoading: loading,
    error: tokensError,
    refetch,
  } = useTokensQuery();
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<string>('');
  const [tokenBalances, setTokenBalances] = useState<Record<string, { adminBalance: string; userBalance: string }>>({});
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  const [buying, setBuying] = useState<string | null>(null);
  const [transferring, setTransferring] = useState<string | null>(null);
  const [checkingCompliance, setCheckingCompliance] = useState<string | null>(null);

  useEffect(() => {
    checkWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza la cuenta con wagmi (sustituye a los listeners del proveedor inyectado).
  useEffect(() => {
    if (wagmiAddress) {
      setAccount(wagmiAddress);
      void loadBalance(wagmiAddress);
    } else {
      setAccount('');
      setBalance('');
      // Limpia los saldos de usuario al desconectar
      setTokenBalances((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          updated[key] = { ...updated[key], userBalance: '0' };
        });
        return updated;
      });
    }
  }, [wagmiAddress]);

  // Recarga saldos y precios cuando cambian la lista de tokens o la cuenta
  useEffect(() => {
    if (tokens.length > 0) {
      void loadTokenBalances(tokens);
      void loadTokenPrices(tokens);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, account]);

  const loadBalance = async (address: string) => {
    if (!address) {
      setBalance('');
      return;
    }

    try {
      const balanceWei = await getPublicClient().getBalance({ address: address as Address });
      const formattedBalance = formatEther(balanceWei);
      setBalance(parseFloat(formattedBalance).toFixed(4));
    } catch {
      setBalance('Error');
    }
  };

  const checkWallet = async () => {
    if (isInjectedWalletAvailable()) {
      try {
        const eip1193 = await getInjectedEip1193();
        if (!eip1193) return;
        const accounts = (await eip1193.request({ method: 'eth_accounts' })) as string[];
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          loadBalance(accounts[0]);
          // Reload token balances if tokens are already loaded
          if (tokens.length > 0) {
            loadTokenBalances(tokens);
          }
        }
      } catch (err) {
              }
    }
  };

  const connectWallet = async () => {
    try {
      if (!isInjectedWalletAvailable()) {
        setError('❌ MetaMask Not Installed\n\nPlease install the MetaMask extension:\nhttps://metamask.io/download/');
        return;
      }

      const eip1193 = await getInjectedEip1193();
      if (!eip1193) {
        setError('❌ MetaMask Not Installed\n\nPlease install the MetaMask extension:\nhttps://metamask.io/download/');
        return;
      }
      const accounts = (await eip1193.request({ method: 'eth_requestAccounts' })) as string[];
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setError(null);
                loadBalance(accounts[0]);
        // Reload token balances when wallet connects
        if (tokens.length > 0) {
          loadTokenBalances(tokens);
        }
        
        alert(`✅ Wallet Connected!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔐 Account:\n${accounts[0]}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      }
    } catch (err: any) {
            
      if (err.code === 4001) {
        setError('🚫 Connection Cancelled\n\nYou rejected the connection request in MetaMask');
      } else {
        setError(`❌ Failed to Connect Wallet\n\n${err.message || 'Unknown error occurred'}`);
      }
    }
  };

  const switchAccount = async () => {
    try {
      if (!isInjectedWalletAvailable()) {
        setError('❌ MetaMask Not Installed\n\nPlease install MetaMask extension to use this feature.');
        return;
      }

      const eip1193 = await getInjectedEip1193();
      if (!eip1193) {
        setError('❌ MetaMask Not Installed\n\nPlease install MetaMask extension to use this feature.');
        return;
      }

      // Request to switch account
      await eip1193.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });

      // Get new account
      const accounts = (await eip1193.request({ method: 'eth_accounts' })) as string[];
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setError(null);
                loadBalance(accounts[0]);
        // Reload token balances when account switches
        if (tokens.length > 0) {
          loadTokenBalances(tokens);
        }
        
        // Show success message
        alert(`✅ Account Switched!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 New Account:\n${accounts[0]}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      }
    } catch (err: any) {
            
      if (err.code === 4001) {
        // User rejected
              } else {
        setError(`❌ Failed to Switch Account\n\n${err.message || 'Unknown error occurred'}`);
      }
    }
  };

  const loadTokenBalances = async (tokensList: Token[]) => {
    if (!tokensList || tokensList.length === 0) {
      return;
    }

    try {
      const client = getPublicClient();
      const balances: Record<string, { adminBalance: string; userBalance: string }> = {};

      for (const token of tokensList) {
        try {
          // Get admin balance
          const tokenDecimals = token.decimals ?? 18; // Default to 18 if undefined
          const adminBalance = await client.readContract({
            address: token.tokenAddress as Address,
            abi: TokenCloneableAbi,
            functionName: 'balanceOf',
            args: [token.adminAddress as Address],
          });
          const adminBalanceFormatted = formatUnits(adminBalance, tokenDecimals);

          // Get user balance if account is connected
          let userBalanceFormatted = '0';
          if (account) {
            try {
              const userBalance = await client.readContract({
                address: token.tokenAddress as Address,
                abi: TokenCloneableAbi,
                functionName: 'balanceOf',
                args: [account as Address],
              });
              userBalanceFormatted = formatUnits(userBalance, tokenDecimals);
            } catch {
              // Se mantiene el saldo 0 si falla la lectura
            }
          }

          // Format balances respecting token decimals
          // Show up to the number of decimals the token has, but at least 4 decimal places
          const decimalsToShow = Math.max(4, tokenDecimals);

          // Parse balances with validation
          const adminBalanceNum = isNaN(parseFloat(adminBalanceFormatted)) ? 0 : parseFloat(adminBalanceFormatted);
          const userBalanceNum = isNaN(parseFloat(userBalanceFormatted)) ? 0 : parseFloat(userBalanceFormatted);

          // Format with appropriate decimals, removing trailing zeros but keeping at least one decimal if needed
          const formatBalance = (num: number): string => {
            if (isNaN(num) || !isFinite(num)) {
              return '0';
            }
            const formatted = num.toFixed(decimalsToShow);
            // Remove trailing zeros, but keep at least one decimal place if the number has decimals
            return formatted.replace(/\.?0+$/, '') || '0';
          };

          balances[token._id || ''] = {
            adminBalance: formatBalance(adminBalanceNum),
            userBalance: formatBalance(userBalanceNum)
          };
        } catch {
          balances[token._id || ''] = {
            adminBalance: 'Error',
            userBalance: 'Error'
          };
        }
      }

      setTokenBalances(balances);
    } catch {
      // Sin RPC disponible se dejan los saldos sin cargar
    }
  };

  const loadTokenPrices = async (tokensList: Token[]) => {
    if (!tokensList || tokensList.length === 0) {
      return;
    }

    try {
      const client = getPublicClient();
      const prices: Record<string, number> = {};

      for (const token of tokensList) {
        try {
          // Get price from contract (in wei)
          // pricePerToken is stored as: price in ETH * 10^18 wei (price per full token)
          const priceWei = await client.readContract({
            address: token.tokenAddress as Address,
            abi: TOKEN_MARKET_ABI,
            functionName: 'pricePerToken',
          });
          // Convert from wei to ETH to get price per full token
          const priceEth = parseFloat(formatEther(priceWei));

          prices[token._id || ''] = priceEth;
        } catch {
          // If price can't be loaded, set to undefined (will show "Price not set")
        }
      }

      setTokenPrices(prices);
    } catch {
      // Sin RPC disponible se dejan los precios sin cargar
    }
  };

  const buyToken = async (token: Token, amount: string) => {
    if (!token._id || !amount) {
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('❌ Invalid amount\n\nPlease enter a positive number');
      return;
    }

    let totalPriceWei: bigint | undefined = undefined;

    try {
      setBuying(token._id);
      setError(null);

      if (!walletClient) {
        throw new Error('MetaMask is not installed.\n\nPlease install MetaMask to buy tokens.');
      }

      const client = getPublicClient();
      const tokenAddress = token.tokenAddress as Address;
      const buyerAddress = (account || walletClient.account?.address) as Address;
      if (!buyerAddress) {
        throw new Error('No se pudo acceder a la wallet');
      }

      // Get price from contract
      // This is stored as: wei per smallest unit of token
      const priceWeiPerUnit = await client.readContract({
        address: tokenAddress,
        abi: TOKEN_MARKET_ABI,
        functionName: 'pricePerToken',
      });

      if (priceWeiPerUnit === BigInt(0)) {
        setError(`❌ Price Not Set\n\nThe token "${token.symbol}" doesn't have a price configured in the contract.\n\nContact the token admin to set a price.`);
        setBuying(null);
        return;
      }

      // Calculate amount in smallest token units
      // Example: 1.5 tokens with 18 decimals = 1.5 * 10^18 units
      const purchaseAmountInUnits = parseUnits(amountNum.toString(), token.decimals);

      // Calculate total price that contract will verify
      // Contract formula: totalPrice = pricePerToken * amount
      // Where:
      //   pricePerToken = wei per unit (what's stored in contract)
      //   amount = units being purchased
      // So: totalPrice = (wei per unit) * (units) = wei
      totalPriceWei = priceWeiPerUnit * purchaseAmountInUnits;

      // Pre-flight checks before attempting transaction
      // Check if token is paused
      const paused = await client.readContract({
        address: tokenAddress,
        abi: TokenCloneableAbi,
        functionName: 'paused',
      });
      if (paused) {
        throw new Error('Token is paused. The admin has temporarily disabled transfers.');
      }

      // Check admin balance - buyToken will fail if admin doesn't have enough
      const adminBalance = await client.readContract({
        address: tokenAddress,
        abi: TokenCloneableAbi,
        functionName: 'balanceOf',
        args: [token.adminAddress as Address],
      });
      if (adminBalance < purchaseAmountInUnits) {
        const adminBalanceFormatted = formatUnits(adminBalance, token.decimals);
        // Format with appropriate decimals
        const decimalsToShow = Math.max(4, token.decimals);
        const adminBalanceNum = parseFloat(adminBalanceFormatted);
        const formattedAdminBalance = adminBalanceNum.toFixed(decimalsToShow).replace(/\.?0+$/, '');
        throw new Error(`Insufficient token supply. Admin has ${formattedAdminBalance} ${token.symbol}, but you're trying to buy ${amountNum} ${token.symbol}.\n\n💡 The admin needs to mint more tokens first.`);
      }

      // Check buyer's ETH balance
      const buyerBalance = await client.getBalance({ address: buyerAddress });
      if (buyerBalance < totalPriceWei) {
        throw new Error(`Insufficient ETH balance. You need ${formatEther(totalPriceWei)} ETH but only have ${formatEther(buyerBalance)} ETH.`);
      }

      // Use buyToken contract method - it handles token transfer and ETH payment
      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: TOKEN_MARKET_ABI,
        functionName: 'buyToken',
        args: [purchaseAmountInUnits],
        value: totalPriceWei,
      });

      await client.waitForTransactionReceipt({ hash });

      // Recarga la lista y los saldos tras la compra
      void refetch();

      setError(null);
      alert(`✅ Purchase Successful!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📦 Tokens Received: ${amountNum} ${token.symbol}\n💰 Total Price: ${formatEther(totalPriceWei)} ETH\n\n📜 Transaction Hash:\n${hash}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    } catch (err) {
      const error = normalizeMarketError(err);
      let errorMsg = '';

      // Check for specific error messages (most specific first)
      if (error.reason === 'Transfer not compliant' || error.message?.includes('Transfer not compliant')) {
        errorMsg = '🚫 Compliance Check Failed\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        errorMsg += `You don't meet the compliance requirements for "${token.symbol}".\n\n`;
        errorMsg += '📋 Required Claims:\n';
        
        token.requiredClaims.forEach(topic => {
          const claimName = CLAIM_DESCRIPTIONS[topic]?.name || `Claim ${topic}`;
          errorMsg += `  • ${claimName}\n`;
        });
        
        errorMsg += '\n💡 What to do:\n';
        errorMsg += '  1. Go to Identity app (port 4001)\n';
        errorMsg += '  2. Request required claims from issuers\n';
        errorMsg += '  3. Wait for approval\n';
        errorMsg += '  4. Load claims to your identity contract\n';
        errorMsg += '  5. Try purchasing again\n';
        errorMsg += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━';
      } else if (error.message?.includes('paused')) {
        errorMsg = '⏸️ Token Paused\n\n';
        errorMsg += 'The token admin has temporarily paused transfers.\n\n';
        errorMsg += 'Please contact the token admin or try again later.';
      } else if (error.message?.includes('Recipient not verified') || error.reason === 'Recipient not verified') {
        errorMsg = '🚫 Identity Verification Required\n\n';
        errorMsg += 'You need to complete identity verification before purchasing tokens.\n\n';
        errorMsg += '📋 Required Claims:\n';
        
        token.requiredClaims.forEach(topic => {
          const claimName = CLAIM_DESCRIPTIONS[topic]?.name || `Claim ${topic}`;
          errorMsg += `  • ${claimName}\n`;
        });
        
        errorMsg += '\n💡 What to do:\n';
        errorMsg += '  1. Go to Identity app (port 4001)\n';
        errorMsg += '  2. Request required claims from issuers\n';
        errorMsg += '  3. Wait for approval\n';
        errorMsg += '  4. Load claims to your identity contract\n';
        errorMsg += '  5. Try purchasing again\n';
        errorMsg += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━';
      } else if (error.message?.includes('Insufficient token supply')) {
        errorMsg = '📦 Insufficient Token Supply\n\n';
        errorMsg += error.message.replace('Insufficient token supply. ', '');
        errorMsg += '\n\n💡 Contact the token admin to mint more tokens.';
      } else if (error.message?.includes('insufficient funds') || error.message?.includes('insufficient balance')) {
        errorMsg = '💸 Insufficient Funds\n\n';
        errorMsg += 'You don\'t have enough ETH in your wallet to complete this transaction.';
      } else if (error.message?.includes('user rejected') || String(error.code) === '4001') {
        errorMsg = '🚫 Transaction Cancelled\n\n';
        errorMsg += 'You rejected the transaction in MetaMask.';
      } else if (error.message?.includes('revert') || error.reason) {
        // Try to decode the actual revert reason
        let revertReason = error.reason || 'Unknown error';

        // Check if we have data to decode (errores custom del ABI generado)
        if (error.data && error.data !== '0x') {
          try {
            const decoded = decodeErrorResult({
              abi: TokenCloneableAbi,
              data: error.data as `0x${string}`,
            });
            revertReason = decoded.errorName;
            if (decoded.args && decoded.args.length > 0) {
              revertReason += ': ' + decoded.args.join(', ');
            }
          } catch {
            // If decoding fails, use generic message
            revertReason = error.message || 'Contract execution reverted';
          }
        }

        errorMsg = '⚠️ Transaction Reverted\n\n';
        errorMsg += `Error: ${revertReason}\n\n`;
        if (totalPriceWei !== undefined) {
          errorMsg += `💰 Value Sent: ${formatEther(totalPriceWei)} ETH\n\n`;
        }
        
        // Don't show generic causes if we already have a specific error
        if (!errorMsg.includes('paused') && !errorMsg.includes('compliant') && !errorMsg.includes('Insufficient')) {
          errorMsg += '💡 Common causes:\n';
          errorMsg += '  • Compliance check failed\n';
          errorMsg += '  • Token is paused\n';
          errorMsg += '  • Insufficient balance in admin wallet\n';
          errorMsg += '  • Account is frozen\n';
        }
      } else {
        // Generic error fallback
        errorMsg = '❌ Purchase Failed\n\n';
        errorMsg += error.message || 'Unknown error occurred';
      }
      
      setError(errorMsg);
    } finally {
      setBuying(null);
    }
  };

  const checkCompliance = async (token: Token) => {
    if (!account) {
      setError('❌ No Wallet Connected\n\nPlease connect your wallet first');
      return;
    }

    try {
      setCheckingCompliance(token._id || '');
      setError(null);

      const client = getPublicClient();
      const userAddress = account as Address;
      const tokenAddress = token.tokenAddress as Address;

      let diagnostic = '🔍 Compliance Diagnostic Report\n\n';
      diagnostic += '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      diagnostic += `📍 Your Address: ${userAddress}\n`;
      diagnostic += `🪙 Token: ${token.name} (${token.symbol})\n`;
      diagnostic += `📍 Token Address: ${token.tokenAddress}\n\n`;
      diagnostic += '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

      // 1. Check if user is verified
      try {
        const isVerified = await client.readContract({
          address: tokenAddress,
          abi: TokenCloneableAbi,
          functionName: 'isVerified',
          args: [userAddress],
        });
        diagnostic += `1️⃣ Is Verified: ${isVerified ? '✅ YES' : '❌ NO'}\n`;

        if (!isVerified) {
          // Get registries to diagnose
          const identityRegistryAddress = await client.readContract({
            address: tokenAddress,
            abi: TokenCloneableAbi,
            functionName: 'identityRegistry',
          });
          const claimTopicsRegistryAddress = await client.readContract({
            address: tokenAddress,
            abi: TokenCloneableAbi,
            functionName: 'claimTopicsRegistry',
          });
          const trustedIssuersRegistryAddress = await client.readContract({
            address: tokenAddress,
            abi: TokenCloneableAbi,
            functionName: 'trustedIssuersRegistry',
          });

          // Convert to string and normalize
          const identityRegStr = identityRegistryAddress.toLowerCase();
          const claimTopicsRegStr = claimTopicsRegistryAddress.toLowerCase();
          const trustedIssuersRegStr = trustedIssuersRegistryAddress.toLowerCase();

          diagnostic += `\n📍 Identity Registry: ${identityRegStr}\n`;
          diagnostic += `📍 Claim Topics Registry: ${claimTopicsRegStr}\n`;
          diagnostic += `📍 Trusted Issuers Registry: ${trustedIssuersRegStr}\n\n`;

          // Check Identity Registry
          if (identityRegStr === ZERO_ADDRESS || identityRegStr === '0x0') {
            diagnostic += '❌ ERROR: Identity Registry not set on token\n\n';
            diagnostic += '⚠️ This token needs to be configured with compliance registries.\n';
            diagnostic += 'The token admin needs to call:\n';
            diagnostic += '  • token.setIdentityRegistry(<REGISTRY_ADDRESS>)\n';
            diagnostic += '  • token.setClaimTopicsRegistry(<REGISTRY_ADDRESS>)\n';
            diagnostic += '  • token.setTrustedIssuersRegistry(<REGISTRY_ADDRESS>)\n\n';
            diagnostic += 'Without these registries, compliance checks cannot work.\n';
            diagnostic += '\n💡 Contact the token admin to configure these registries.\n';
          } else {
            const identityRegistryAddress = identityRegStr as Address;
            const isRegistered = await client.readContract({
              address: identityRegistryAddress,
              abi: IdentityRegistryAbi,
              functionName: 'isRegistered',
              args: [userAddress],
            });
            diagnostic += `2️⃣ Registered in Identity Registry: ${isRegistered ? '✅ YES' : '❌ NO'}\n`;

            if (!isRegistered) {
              diagnostic += '   ⚠️ You need to register your identity first\n';
            } else {
              const identityAddress = await client.readContract({
                address: identityRegistryAddress,
                abi: IdentityRegistryAbi,
                functionName: 'getIdentity',
                args: [userAddress],
              });
              diagnostic += `3️⃣ Identity Contract: ${identityAddress}\n`;

              if (identityAddress === ZERO_ADDRESS) {
                diagnostic += '   ❌ ERROR: Identity contract not found\n';
              } else {
                // Check Claim Topics Registry
                if (claimTopicsRegStr === ZERO_ADDRESS || claimTopicsRegStr === '0x0') {
                  diagnostic += '4️⃣ Claim Topics Registry: Not set (no claims required)\n';
                } else {
                  const claimTopicsRegistryAddress = claimTopicsRegStr as Address;
                  const requiredTopics = await client.readContract({
                    address: claimTopicsRegistryAddress,
                    abi: ClaimTopicsRegistryAbi,
                    functionName: 'getClaimTopics',
                  });
                  diagnostic += `4️⃣ Required Claim Topics: ${requiredTopics.length > 0 ? requiredTopics.join(', ') : 'None'}\n\n`;

                  // Check Trusted Issuers Registry
                  if (trustedIssuersRegStr === ZERO_ADDRESS || trustedIssuersRegStr === '0x0') {
                    diagnostic += '❌ ERROR: Trusted Issuers Registry not set\n';
                    diagnostic += '   The token admin needs to call:\n';
                    diagnostic += '   token.setTrustedIssuersRegistry(<REGISTRY_ADDRESS>)\n\n';
                  } else {
                    const trustedIssuersRegistryAddress = trustedIssuersRegStr as Address;

                    diagnostic += '📋 Claim Verification:\n';
                    for (const topic of requiredTopics) {
                      const topicNum = Number(topic);
                      const topicName = CLAIM_DESCRIPTIONS[topicNum]?.name || `Claim ${topicNum}`;

                      try {
                        const claimIssuers = await client.readContract({
                          address: identityAddress,
                          abi: IdentityCloneableAbi,
                          functionName: 'getClaimIssuersForTopic',
                          args: [topic],
                        });
                        diagnostic += `\n  Topic ${topicNum} (${topicName}):\n`;

                        if (claimIssuers.length === 0) {
                          diagnostic += `    ❌ No claim found in your identity\n`;
                        } else {
                          let hasValidIssuer = false;
                          for (const issuer of claimIssuers) {
                            const issuerAddress = issuer as Address;
                            const isTrusted = await client.readContract({
                              address: trustedIssuersRegistryAddress,
                              abi: TrustedIssuersRegistryAbi,
                              functionName: 'isTrustedIssuer',
                              args: [issuerAddress],
                            });
                            const canIssueTopic = await client.readContract({
                              address: trustedIssuersRegistryAddress,
                              abi: TrustedIssuersRegistryAbi,
                              functionName: 'hasClaimTopic',
                              args: [issuerAddress, topic],
                            });

                            if (isTrusted && canIssueTopic) {
                              diagnostic += `    ✅ Claim found from trusted issuer: ${issuer.substring(0, 10)}...\n`;
                              hasValidIssuer = true;
                              break;
                            } else {
                              diagnostic += `    ⚠️ Claim found but issuer not trusted: ${issuer.substring(0, 10)}...\n`;
                              diagnostic += `       - Is trusted: ${isTrusted}\n`;
                              diagnostic += `       - Can issue topic ${topicNum}: ${canIssueTopic}\n`;
                            }
                          }
                          if (!hasValidIssuer) {
                            diagnostic += `    ❌ No trusted issuer found for this claim\n`;
                          }
                        }
                      } catch (err) {
                        diagnostic += `    ❌ Error checking claim: ${err instanceof Error ? err.message : 'Unknown'}\n`;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        diagnostic += `\n❌ Error checking verification: ${err instanceof Error ? err.message : 'Unknown'}\n`;
      }

      // 2. Check canTransfer
      try {
        const adminAddress = token.adminAddress as Address;
        const testAmount = parseUnits('1', token.decimals);
        const canTransfer = await client.readContract({
          address: tokenAddress,
          abi: TokenCloneableAbi,
          functionName: 'canTransfer',
          args: [adminAddress, userAddress, testAmount],
        });
        diagnostic += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        diagnostic += `5️⃣ Can Transfer: ${canTransfer ? '✅ YES' : '❌ NO'}\n`;
        if (!canTransfer) {
          // Check if frozen
          const isFrozen = await client.readContract({
            address: tokenAddress,
            abi: TokenCloneableAbi,
            functionName: 'isFrozen',
            args: [userAddress],
          });
          if (isFrozen) {
            diagnostic += `   ⚠️ Your account is frozen\n`;
          }
        }
      } catch (err) {
        diagnostic += `\n⚠️ Error checking canTransfer: ${err instanceof Error ? err.message : 'Unknown'}\n`;
      }

      diagnostic += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

      setError(diagnostic);
    } catch (err: any) {
      setError(`❌ Error Checking Compliance\n\n${err.message || 'Unknown error occurred'}`);
    } finally {
      setCheckingCompliance(null);
    }
  };

  const transferToken = async (token: Token) => {
    const recipient = prompt('Enter recipient address:');
    if (!recipient) {
      return;
    }

    // Validate address format
    if (!isAddress(recipient)) {
      setError('❌ Invalid Address\n\nThe address you entered is not a valid Ethereum address.\n\nPlease check and try again.');
      return;
    }

    const amount = prompt('Enter amount to transfer:');
    if (!amount) {
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('❌ Invalid Amount\n\nPlease enter a positive number');
      return;
    }

    const client = getPublicClient();
    const tokenAddress = token.tokenAddress as Address;
    const recipientAddress = recipient as Address;

    try {
      setTransferring(token._id || '');
      setError(null);

      if (!walletClient) {
        throw new Error('MetaMask is not installed.\n\nPlease install MetaMask to transfer tokens.');
      }

      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: TokenCloneableAbi,
        functionName: 'transfer',
        args: [recipientAddress, parseUnits(amountNum.toString(), token.decimals)],
      });

      await client.waitForTransactionReceipt({ hash });

      // Reload balances after successful transfer
      if (tokens.length > 0) {
        loadTokenBalances(tokens);
      }

      setError(null);
      alert(`✅ Transfer Successful!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📦 Amount: ${amountNum} ${token.symbol}\n📫 To: ${recipient.substring(0, 10)}...${recipient.substring(recipient.length - 8)}\n\n📜 Transaction Hash:\n${hash}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    } catch (err) {
      const error = normalizeMarketError(err);
      let errorMsg = '❌ Transfer Failed\n\n';

      // Check for specific error messages
      if (error.reason === 'Transfer not compliant' || error.message.includes('Transfer not compliant')) {
        errorMsg = '🚫 Compliance Check Failed\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

        // Do detailed diagnostic
        try {
          const userAddress = account as Address;
          const transferAmount = parseUnits(amountNum.toString(), token.decimals);

          // Check if paused
          const isPaused = await client.readContract({
            address: tokenAddress,
            abi: TokenCloneableAbi,
            functionName: 'paused',
          });
          if (isPaused) {
            errorMsg += '❌ Token is PAUSED by admin\n\n';
            errorMsg += 'The token contract has been paused. Contact the token admin to unpause.\n';
            errorMsg += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━';
          } else {
            // Check if frozen
            const senderFrozen = await client.readContract({
              address: tokenAddress,
              abi: TokenCloneableAbi,
              functionName: 'isFrozen',
              args: [userAddress],
            });
            const recipientFrozen = await client.readContract({
              address: tokenAddress,
              abi: TokenCloneableAbi,
              functionName: 'isFrozen',
              args: [recipientAddress],
            });

            if (senderFrozen) {
              errorMsg += `❌ YOUR account (${userAddress.substring(0, 10)}...) is FROZEN\n\n`;
              errorMsg += 'Contact the token admin to unfreeze your account.\n';
            } else if (recipientFrozen) {
              errorMsg += `❌ RECIPIENT account (${recipient.substring(0, 10)}...) is FROZEN\n\n`;
              errorMsg += 'The recipient\'s account is frozen. They need to contact the token admin.\n';
            } else {
              // Check verification status
              const senderVerified = await client.readContract({
                address: tokenAddress,
                abi: TokenCloneableAbi,
                functionName: 'isVerified',
                args: [userAddress],
              });
              const recipientVerified = await client.readContract({
                address: tokenAddress,
                abi: TokenCloneableAbi,
                functionName: 'isVerified',
                args: [recipientAddress],
              });

              errorMsg += `📍 Sender (${userAddress.substring(0, 10)}...):\n`;
              errorMsg += `   Verified: ${senderVerified ? '✅ YES' : '❌ NO'}\n\n`;

              errorMsg += `📍 Recipient (${recipient.substring(0, 10)}...):\n`;
              errorMsg += `   Verified: ${recipientVerified ? '✅ YES' : '❌ NO'}\n\n`;

              if (!senderVerified) {
                errorMsg += '⚠️ YOU need to:\n';
                errorMsg += '  1. Register your identity in Identity app (port 4001)\n';
                errorMsg += '  2. Obtain required claims\n';
                errorMsg += '  3. Load claims to your identity contract\n\n';
              }

              if (!recipientVerified) {
                errorMsg += '⚠️ RECIPIENT needs to:\n';
                errorMsg += '  1. Register their identity in Identity app (port 4001)\n';
                errorMsg += '  2. Obtain required claims\n';
                errorMsg += '  3. Load claims to their identity contract\n\n';
              }

              // Check compliance modules
              try {
                const complianceModules = await client.readContract({
                  address: tokenAddress,
                  abi: TokenCloneableAbi,
                  functionName: 'getComplianceModules',
                });
                if (complianceModules.length > 0) {
                  errorMsg += `🔒 Compliance Modules: ${complianceModules.length}\n`;

                  for (let i = 0; i < complianceModules.length; i++) {
                    const moduleAddr = complianceModules[i] as Address;
                    errorMsg += `   Module ${i + 1}: ${moduleAddr.substring(0, 10)}...\n`;

                    try {
                      // Try to call canTransfer on each module
                      const moduleCanTransfer = await client.readContract({
                        address: moduleAddr,
                        abi: IComplianceAbi,
                        functionName: 'canTransfer',
                        args: [userAddress, recipientAddress, transferAmount],
                      });
                      if (!moduleCanTransfer) {
                        errorMsg += `      ❌ This module is BLOCKING the transfer\n`;
                      }
                    } catch {
                      errorMsg += `      ⚠️ Could not check module status\n`;
                    }
                  }
                }
              } catch {
                // Ignore if can't get modules
              }

              // Show required claims
              if (token.requiredClaims && token.requiredClaims.length > 0) {
                errorMsg += '\n📋 Required Claims:\n';
                token.requiredClaims.forEach(topic => {
                  const claimName = CLAIM_DESCRIPTIONS[topic]?.name || `Claim ${topic}`;
                  errorMsg += `  • ${claimName}\n`;
                });
              }
            }

            errorMsg += '\n💡 Use "Check Compliance" button for detailed diagnostic\n';
            errorMsg += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━';
          }
        } catch {
          // Fallback to simple message if diagnostic fails
          errorMsg += `Transfer failed compliance check.\n\n`;
          errorMsg += `Possible causes:\n`;
          errorMsg += `  • Token is paused\n`;
          errorMsg += `  • Account(s) are frozen\n`;
          errorMsg += `  • Sender or recipient not verified\n`;
          errorMsg += `  • Compliance module restrictions\n`;
          errorMsg += `\nUse "Check Compliance" button for detailed info.\n`;
          errorMsg += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        }
      } else if (error.message.includes('insufficient')) {
        errorMsg += '💸 Insufficient Balance\n\nYou don\'t have enough tokens to transfer';
      } else if (error.message.includes('revert')) {
        errorMsg += '⚠️ Transaction Reverted\n\nPossible causes:\n• Token is paused by admin\n• Transfer restrictions active\n• Invalid recipient address';
      } else if (error.message.includes('user rejected') || error.message.includes('denied') || String(error.code) === '4001') {
        errorMsg += '🚫 Transaction Cancelled\n\nYou rejected the transaction in MetaMask';
      } else {
        errorMsg += error.message || 'Unknown error occurred';
      }

      setError(errorMsg);
    } finally {
      setTransferring(null);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                🏪 Token Marketplace
              </h1>
              <p className="mt-2 text-slate-300">
                Buy and transfer RWA tokens
              </p>
              
              {/* Navigation */}
              <div className="mt-3 flex gap-3">
                <Link
                  href="/"
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  ← Back to Factory
                </Link>
              </div>
            </div>
            
            {/* Wallet Section */}
            <div className="flex items-center gap-3">
              {account ? (
                <>
                  <div className="rounded-lg bg-white px-4 py-2 shadow dark:bg-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Connected</p>
                    <code className="text-sm font-semibold text-gray-900 dark:text-white">
                      {account.substring(0, 6)}...{account.substring(account.length - 4)}
                    </code>
                    {balance && (
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        Balance: <span className="font-semibold text-green-600 dark:text-green-400">{balance} ETH</span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={switchAccount}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    🔄 Switch Account
                  </button>
                </>
              ) : (
                <button
                  onClick={connectWallet}
                  className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>

        {(error || tokensError) && (
          <div className="mb-6 rounded-lg border-2 border-red-300 bg-red-50 p-6 shadow-lg dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <pre className="whitespace-pre-wrap font-sans text-sm text-red-800 dark:text-red-400">
                  {error || tokensError?.message || 'Failed to load tokens'}
                </pre>
                <button
                  onClick={() => setError(null)}
                  className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tokens Grid */}
        {loading ? (
          <div className="text-center text-gray-600 dark:text-gray-400">
            Loading tokens...
          </div>
        ) : tokens.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow dark:bg-gray-800">
            <p className="text-gray-600 dark:text-gray-400">
              No tokens available yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tokens.map((token) => (
              <div
                key={token._id}
                className="rounded-lg bg-white p-6 shadow-lg transition-all hover:shadow-xl dark:bg-gray-800"
              >
                {/* Header */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    💎 {token.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {token.symbol}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    💰 Price per Token
                  </p>
                  <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 p-4 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800/40">
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-400">
                          {tokenPrices[token._id || ''] !== undefined && tokenPrices[token._id || ''] !== null
                            ? (() => {
                                const price = (tokenPrices[token._id || ''] || 0).toString();
                                const parts = price.split('.');
                                return (
                                  <>
                                    <span>{parts[0]}</span>
                                    {parts[1] && (
                                      <span className="text-sm">
                                        .{parts[1]}
                                      </span>
                                    )}
                                  </>
                                );
                              })()
                            : '⏳'}
                        </p>
                        {tokenPrices[token._id || ''] !== undefined && tokenPrices[token._id || ''] !== null && (
                          <span className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">ETH</span>
                        )}
                      </div>
                      {tokenPrices[token._id || ''] !== undefined && tokenPrices[token._id || ''] !== null && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          = {(tokenPrices[token._id || ''] * Math.pow(10, 18)).toFixed(0)} wei
                        </p>
                      )}
                    </div>
                    {tokenPrices[token._id || ''] !== undefined && tokenPrices[token._id || ''] !== null && tokenPrices[token._id || ''] > 0 && (
                      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-300 font-medium">
                        ✓ Available for purchase
                      </p>
                    )}
                    {tokenPrices[token._id || ''] === 0 && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-300 font-medium">
                        ⚠️ Price not configured
                      </p>
                    )}
                  </div>
                </div>

                {/* Token Info */}
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Token Address:
                    </p>
                    <code className="block break-all text-xs text-gray-900 dark:text-white">
                      {token.tokenAddress}
                    </code>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Admin:
                    </p>
                    <code className="block break-all text-xs text-gray-900 dark:text-white">
                      {token.adminAddress}
                    </code>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Token Factory:
                    </p>
                    <code className="block break-all text-xs text-gray-900 dark:text-white">
                      {TOKEN_CLONE_FACTORY_ADDRESS}
                    </code>
                  </div>

                  {/* Balances */}
                  <div className="mt-3 space-y-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Admin Balance:
                      </p>
                      <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                        {tokenBalances[token._id || '']?.adminBalance !== undefined 
                          ? `${tokenBalances[token._id || ''].adminBalance} ${token.symbol}`
                          : 'Loading...'}
                      </p>
                    </div>
                    {account && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Your Balance:
                        </p>
                        <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                          {tokenBalances[token._id || '']?.userBalance !== undefined 
                            ? `${tokenBalances[token._id || ''].userBalance} ${token.symbol}`
                            : 'Loading...'}
                        </p>
                      </div>
                    )}
                  </div>

                  {token.description && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Description:
                      </p>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        {token.description}
                      </p>
                    </div>
                  )}

                  {/* Required Claims */}
                  {token.requiredClaims && token.requiredClaims.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Required Claims:
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {token.requiredClaims.map((topic) => (
                          <span
                            key={topic}
                            className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                          >
                            {CLAIM_DESCRIPTIONS[topic]?.name || `Claim ${topic}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {tokenPrices[token._id || ''] !== undefined && tokenPrices[token._id || ''] > 0 && account && (
                  <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
                    <button
                      onClick={() => {
                        const price = tokenPrices[token._id || ''];
                        const amount = prompt(`How many ${token.symbol} tokens do you want to buy?\n\nPrice: ${price} ETH per token`);
                        if (amount) {
                          buyToken(token, amount);
                        }
                      }}
                      disabled={buying === token._id}
                      className="w-full rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-green-700 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {buying === token._id ? '💳 Processing...' : '💰 Buy Tokens'}
                    </button>
                  </div>
                )}

                {!account && (
                  <div className="mt-4 rounded-lg bg-gray-100 p-3 text-center dark:bg-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Connect wallet to buy or transfer
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-12 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            ℹ️ Marketplace Information
          </h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>
              • <strong>Buy Tokens:</strong> Purchase RWA tokens at the listed price (requires compliance claims)
            </p>
            <p>
              • <strong>Switch Account:</strong> Change the connected wallet to view different balances
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              ⚠️ Note: Actual token purchases would require payment handling. This is a simplified implementation.
            </p>
          </div>
        </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

