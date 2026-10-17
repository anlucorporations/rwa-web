'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Token } from '@/types/token';
import { CLAIM_DESCRIPTIONS } from '@/types/token';
import { TOKEN_CLONE_FACTORY_ADDRESS } from '@/lib/contracts';
import { ZERO_ADDRESS } from '@rwa/shared/network';

export default function MarketplacePage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<string>('');
  const [tokenBalances, setTokenBalances] = useState<Record<string, { adminBalance: string; userBalance: string }>>({});
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  const [buying, setBuying] = useState<string | null>(null);
  const [transferring, setTransferring] = useState<string | null>(null);
  const [checkingCompliance, setCheckingCompliance] = useState<string | null>(null);

  useEffect(() => {
    loadTokens();
    checkWallet();
    
    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        console.log('🔄 Account changed:', accounts[0]);
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          setError(null);
          loadBalance(accounts[0]);
          // Reload token balances when account changes
          if (tokens.length > 0) {
            loadTokenBalances(tokens);
          }
        } else {
          setAccount('');
          setBalance('');
          // Clear user balances when disconnected
          setTokenBalances(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(key => {
              updated[key] = { ...updated[key], userBalance: '0' };
            });
            return updated;
          });
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      // Cleanup
      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  // Reload token balances when account changes or when tokens are loaded with account available
  useEffect(() => {
    if (tokens.length > 0) {
      console.log('🔄 Reloading token balances, account:', account || 'not connected');
      loadTokenBalances(tokens);
    }
  }, [account]);

  const loadBalance = async (address: string) => {
    if (!address) {
      setBalance('');
      return;
    }
    
    try {
      const { ethers } = await import('ethers');
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const balance = await provider.getBalance(address);
        const formattedBalance = ethers.formatEther(balance);
        setBalance(parseFloat(formattedBalance).toFixed(4));
      }
    } catch (err) {
      console.error('Error loading balance:', err);
      setBalance('Error');
    }
  };

  const checkWallet = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          console.log('✅ Wallet connected:', accounts[0]);
          loadBalance(accounts[0]);
          // Reload token balances if tokens are already loaded
          if (tokens.length > 0) {
            loadTokenBalances(tokens);
          }
        }
      } catch (err) {
        console.error('Error checking wallet:', err);
      }
    }
  };

  const connectWallet = async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        setError('❌ MetaMask Not Installed\n\nPlease install the MetaMask extension:\nhttps://metamask.io/download/');
        return;
      }

      console.log('🔗 Requesting wallet connection...');
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setError(null);
        console.log('✅ Wallet connected:', accounts[0]);
        loadBalance(accounts[0]);
        // Reload token balances when wallet connects
        if (tokens.length > 0) {
          loadTokenBalances(tokens);
        }
        
        alert(`✅ Wallet Connected!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔐 Account:\n${accounts[0]}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      }
    } catch (err: any) {
      console.error('Error connecting wallet:', err);
      
      if (err.code === 4001) {
        setError('🚫 Connection Cancelled\n\nYou rejected the connection request in MetaMask');
      } else {
        setError(`❌ Failed to Connect Wallet\n\n${err.message || 'Unknown error occurred'}`);
      }
    }
  };

  const switchAccount = async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        setError('❌ MetaMask Not Installed\n\nPlease install MetaMask extension to use this feature.');
        return;
      }

      console.log('🔄 Requesting account switch...');

      // Request to switch account
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });

      // Get new account (this will trigger accountsChanged event)
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setError(null);
        console.log('✅ Switched to:', accounts[0]);
        loadBalance(accounts[0]);
        // Reload token balances when account switches
        if (tokens.length > 0) {
          loadTokenBalances(tokens);
        }
        
        // Show success message
        alert(`✅ Account Switched!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 New Account:\n${accounts[0]}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      }
    } catch (err: any) {
      console.error('Error switching account:', err);
      
      if (err.code === 4001) {
        // User rejected
        console.log('User cancelled account switch');
      } else {
        setError(`❌ Failed to Switch Account\n\n${err.message || 'Unknown error occurred'}`);
      }
    }
  };

  const loadTokens = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/tokens');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to load tokens');
      }

      setTokens(result.data);
      
      // Load balances and prices after tokens are loaded
      if (result.data && result.data.length > 0) {
        loadTokenBalances(result.data);
        loadTokenPrices(result.data);
      }
    } catch (err) {
      console.error('Error loading tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tokens');
    } finally {
      setLoading(false);
    }
  };

  const loadTokenBalances = async (tokensList: Token[]) => {
    if (!tokensList || tokensList.length === 0) {
      return;
    }

    try {
      const { ethers } = await import('ethers');
      const { TOKEN_CLONEABLE_ABI } = await import('@/lib/contracts/TokenCloneable');

      let provider: any = null;
      if (typeof window !== 'undefined' && window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        // If no wallet, we can still load admin balances using a read-only provider
        const { NETWORK_CONFIG } = await import('@/lib/contracts');
        provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl) as any;
      }

      const balances: Record<string, { adminBalance: string; userBalance: string }> = {};

      for (const token of tokensList) {
        try {
          const tokenContract = new ethers.Contract(
            token.tokenAddress,
            TOKEN_CLONEABLE_ABI,
            provider
          );

          // Get admin balance
          const tokenDecimals = token.decimals ?? 18; // Default to 18 if undefined
          const adminBalance = await tokenContract.balanceOf(token.adminAddress);
          const adminBalanceFormatted = ethers.formatUnits(adminBalance, tokenDecimals);

          // Get user balance if account is connected
          let userBalanceFormatted = '0';
          if (account) {
            try {
              const userBalance = await tokenContract.balanceOf(account);
              userBalanceFormatted = ethers.formatUnits(userBalance, tokenDecimals);
              console.log(`💰 User balance for ${token.symbol} (${token._id}): ${userBalanceFormatted} (raw: ${userBalance.toString()})`);
            } catch (err) {
              console.error(`Error loading user balance for token ${token._id}:`, err);
            }
          } else {
            console.log(`⚠️ No account connected, skipping user balance for token ${token.symbol}`);
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
        } catch (err) {
          console.error(`Error loading balances for token ${token._id}:`, err);
          balances[token._id || ''] = {
            adminBalance: 'Error',
            userBalance: 'Error'
          };
        }
      }

      setTokenBalances(balances);
    } catch (err) {
      console.error('Error loading token balances:', err);
    }
  };

  const loadTokenPrices = async (tokensList: Token[]) => {
    if (!tokensList || tokensList.length === 0) {
      return;
    }

    try {
      const { ethers } = await import('ethers');
      const { TOKEN_CLONEABLE_ABI } = await import('@/lib/contracts/TokenCloneable');

      let provider: any = null;
      if (typeof window !== 'undefined' && window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        // Use read-only provider
        const { NETWORK_CONFIG } = await import('@/lib/contracts');
        provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl) as any;
      }

      const prices: Record<string, number> = {};

      for (const token of tokensList) {
        try {
          const tokenContract = new ethers.Contract(
            token.tokenAddress,
            TOKEN_CLONEABLE_ABI,
            provider
          );

          // Get price from contract (in wei)
          // pricePerToken is stored as: price in ETH * 10^18 wei (price per full token)
          const priceWei = await tokenContract.pricePerToken();
          // Convert from wei to ETH to get price per full token
          const priceEth = parseFloat(ethers.formatEther(priceWei));
          
          prices[token._id || ''] = priceEth;
          console.log(`💰 Token ${token.symbol} price from contract: ${priceEth} ETH per token`);
        } catch (err) {
          console.error(`Error loading price for token ${token._id}:`, err);
          // If price can't be loaded, set to undefined (will show "Price not set")
        }
      }

      setTokenPrices(prices);
    } catch (err) {
      console.error('Error loading token prices:', err);
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

      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask is not installed.\n\nPlease install MetaMask to buy tokens.');
      }

      const { ethers } = await import('ethers');
      const { TOKEN_CLONEABLE_ABI } = await import('@/lib/contracts/TokenCloneable');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const buyerAddress = await signer.getAddress();

      // Get token contract instance
      const tokenContractReadOnly = new ethers.Contract(
        token.tokenAddress,
        TOKEN_CLONEABLE_ABI,
        provider
      );

      // Get price from contract
      // This is stored as: wei per smallest unit of token
      const priceWeiPerUnit = await tokenContractReadOnly.pricePerToken();

      console.log(`📍 Price Debug:`);
      console.log(`   Raw from contract: ${priceWeiPerUnit.toString()}`);
      console.log(`   Formatted as ETH per token: ${ethers.formatEther(priceWeiPerUnit * (BigInt(10) ** BigInt(token.decimals)))}`);

      if (priceWeiPerUnit === 0n) {
        setError(`❌ Price Not Set\n\nThe token "${token.symbol}" doesn't have a price configured in the contract.\n\nContact the token admin to set a price.`);
        setBuying(null);
        return;
      }

      // Get token contract instance for writing
      const tokenContract = new ethers.Contract(
        token.tokenAddress,
        TOKEN_CLONEABLE_ABI,
        signer
      );

      // Calculate amount in smallest token units
      // Example: 1.5 tokens with 18 decimals = 1.5 * 10^18 units
      const purchaseAmountInUnits = ethers.parseUnits(amountNum.toString(), token.decimals);

      // Calculate total price that contract will verify
      // Contract formula: totalPrice = pricePerToken * amount
      // Where:
      //   pricePerToken = wei per unit (what's stored in contract)
      //   amount = units being purchased
      // So: totalPrice = (wei per unit) * (units) = wei
      const totalPriceWei = priceWeiPerUnit * purchaseAmountInUnits;

      // For display: calculate what the user sees (ETH per token)
      const tokenUnitsPerToken = BigInt(10) ** BigInt(token.decimals);
      const pricePerTokenWei = priceWeiPerUnit * tokenUnitsPerToken;
      const pricePerTokenEth = parseFloat(ethers.formatEther(pricePerTokenWei));
      const totalPriceEth = amountNum * pricePerTokenEth;

      console.log(`\n💰 PURCHASE DETAILS:`);
      console.log(`   Amount: ${amountNum} ${token.symbol}`);
      console.log(`   Amount in units: ${purchaseAmountInUnits.toString()}`);
      console.log(`   Price per unit (from contract): ${priceWeiPerUnit.toString()} wei`);
      console.log(`   Calculation: ${priceWeiPerUnit.toString()} * ${purchaseAmountInUnits.toString()} = ${totalPriceWei.toString()}`);
      console.log(`   Total price in wei: ${totalPriceWei.toString()}`);
      console.log(`   Total price in ETH: ${ethers.formatEther(totalPriceWei)}`);
      console.log(`   User will send: value = ${totalPriceWei.toString()} wei\n`);
      
      // Pre-flight checks before attempting transaction
      try {
        // Check if token is paused
        const paused = await tokenContractReadOnly.paused();
        if (paused) {
          throw new Error('Token is paused. The admin has temporarily disabled transfers.');
        }

        // Check admin balance - buyToken will fail if admin doesn't have enough
        const adminBalance = await tokenContractReadOnly.balanceOf(token.adminAddress);
        if (adminBalance < purchaseAmountInUnits) {
          const adminBalanceFormatted = ethers.formatUnits(adminBalance, token.decimals);
          // Format with appropriate decimals
          const decimalsToShow = Math.max(4, token.decimals);
          const adminBalanceNum = parseFloat(adminBalanceFormatted);
          const formattedAdminBalance = adminBalanceNum.toFixed(decimalsToShow).replace(/\.?0+$/, '');
          throw new Error(`Insufficient token supply. Admin has ${formattedAdminBalance} ${token.symbol}, but you're trying to buy ${amountNum} ${token.symbol}.\n\n💡 The admin needs to mint more tokens first.`);
        }

        // Check buyer's ETH balance
        const buyerBalance = await provider.getBalance(buyerAddress);
        if (buyerBalance < totalPriceWei) {
          throw new Error(`Insufficient ETH balance. You need ${ethers.formatEther(totalPriceWei)} ETH but only have ${ethers.formatEther(buyerBalance)} ETH.`);
        }
      } catch (preflightError) {
        // Re-throw preflight errors with better context
        throw preflightError;
      }
      console.log('totalPriceWei', totalPriceWei);
      // Use buyToken contract method - it handles token transfer and ETH payment
      const tx = await tokenContract.buyToken(purchaseAmountInUnits, { value: totalPriceWei });
      
      await tx.wait();
      
      // Reload balances and prices after successful purchase
      if (tokens.length > 0) {
        loadTokenBalances(tokens);
        loadTokenPrices(tokens);
      }
      
      setError(null);
      alert(`✅ Purchase Successful!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📦 Tokens Received: ${amountNum} ${token.symbol}\n💰 Total Price: ${ethers.formatEther(totalPriceWei)} ETH\n\n📜 Transaction Hash:\n${tx.hash}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    } catch (err) {
      console.error('Error buying token:', err);
      
      const error = err as { reason?: string; message?: string; code?: string; data?: string };
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
      } else if (error.message?.includes('execution reverted')) {
        // Try to decode the actual revert reason
        let revertReason = 'Unknown error';
        
        // Check if we have data to decode
        if (error.data && error.data !== '0x') {
          try {
            // Try to decode common error messages
            const { TOKEN_CLONEABLE_ABI } = await import('@/lib/contracts/TokenCloneable');
            const { ethers: ethersLib } = await import('ethers');
            const contractInterface = new ethersLib.Interface(TOKEN_CLONEABLE_ABI);
            const decoded = contractInterface.parseError(error.data);
            if (decoded) {
              revertReason = decoded.name;
              if (decoded.args && decoded.args.length > 0) {
                revertReason += ': ' + decoded.args.join(', ');
              }
            }
          } catch {
            // If decoding fails, use generic message
            revertReason = 'Contract execution reverted';
          }
        }
        
        errorMsg = '⚠️ Transaction Reverted\n\n';
        errorMsg += `Error: ${revertReason}\n\n`;
        if (totalPriceWei !== undefined) {
          errorMsg += `💰 Value Sent: ${ethers.formatEther(totalPriceWei)} ETH\n\n`;
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

      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const { ethers } = await import('ethers');
      const { TOKEN_CLONEABLE_ABI } = await import('@/lib/contracts/TokenCloneable');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const tokenContract = new ethers.Contract(
        token.tokenAddress,
        TOKEN_CLONEABLE_ABI,
        provider
      );

      console.log('🔍 Checking compliance for:', userAddress);

      let diagnostic = '🔍 Compliance Diagnostic Report\n\n';
      diagnostic += '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      diagnostic += `📍 Your Address: ${userAddress}\n`;
      diagnostic += `🪙 Token: ${token.name} (${token.symbol})\n`;
      diagnostic += `📍 Token Address: ${token.tokenAddress}\n\n`;
      diagnostic += '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

      // 1. Check if user is verified
      try {
        const isVerified = await tokenContract.isVerified(userAddress);
        diagnostic += `1️⃣ Is Verified: ${isVerified ? '✅ YES' : '❌ NO'}\n`;
        
        if (!isVerified) {
          // Get registries to diagnose
          const identityRegistryAddress = await tokenContract.identityRegistry();
          const claimTopicsRegistryAddress = await tokenContract.claimTopicsRegistry();
          const trustedIssuersRegistryAddress = await tokenContract.trustedIssuersRegistry();

          // Convert to string and normalize
          const identityRegStr = typeof identityRegistryAddress === 'string' 
            ? identityRegistryAddress.toLowerCase() 
            : identityRegistryAddress.toString();
          const claimTopicsRegStr = typeof claimTopicsRegistryAddress === 'string'
            ? claimTopicsRegistryAddress.toLowerCase()
            : claimTopicsRegistryAddress.toString();
          const trustedIssuersRegStr = typeof trustedIssuersRegistryAddress === 'string'
            ? trustedIssuersRegistryAddress.toLowerCase()
            : trustedIssuersRegistryAddress.toString();

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
            const IDENTITY_REGISTRY_ABI = [
              "function isRegistered(address) view returns (bool)",
              "function getIdentity(address) view returns (address)"
            ];
            const identityRegistry = new ethers.Contract(
              identityRegStr,
              IDENTITY_REGISTRY_ABI,
              provider
            );

            const isRegistered = await identityRegistry.isRegistered(userAddress);
            diagnostic += `2️⃣ Registered in Identity Registry: ${isRegistered ? '✅ YES' : '❌ NO'}\n`;

            if (!isRegistered) {
              diagnostic += '   ⚠️ You need to register your identity first\n';
            } else {
              const identityAddress = await identityRegistry.getIdentity(userAddress);
              diagnostic += `3️⃣ Identity Contract: ${identityAddress}\n`;

              if (identityAddress === ZERO_ADDRESS) {
                diagnostic += '   ❌ ERROR: Identity contract not found\n';
              } else {
                // Check Claim Topics Registry
                if (claimTopicsRegStr === ZERO_ADDRESS || claimTopicsRegStr === '0x0') {
                  diagnostic += '4️⃣ Claim Topics Registry: Not set (no claims required)\n';
                } else {
                  const CLAIM_TOPICS_REGISTRY_ABI = [
                    "function getClaimTopics() view returns (uint256[])"
                  ];
                  const claimTopicsRegistry = new ethers.Contract(
                    claimTopicsRegStr,
                    CLAIM_TOPICS_REGISTRY_ABI,
                    provider
                  );

                  const requiredTopics = await claimTopicsRegistry.getClaimTopics();
                  diagnostic += `4️⃣ Required Claim Topics: ${requiredTopics.length > 0 ? requiredTopics.join(', ') : 'None'}\n\n`;

                  // Check Trusted Issuers Registry
                  if (trustedIssuersRegStr === ZERO_ADDRESS || trustedIssuersRegStr === '0x0') {
                    diagnostic += '❌ ERROR: Trusted Issuers Registry not set\n';
                    diagnostic += '   The token admin needs to call:\n';
                    diagnostic += '   token.setTrustedIssuersRegistry(<REGISTRY_ADDRESS>)\n\n';
                  } else {
                    const TRUSTED_ISSUERS_REGISTRY_ABI = [
                      "function hasClaimTopic(address,uint256) view returns (bool)",
                      "function isTrustedIssuer(address) view returns (bool)",
                      "function getTrustedIssuers() view returns (address[])"
                    ];
                    const trustedIssuersRegistry = new ethers.Contract(
                      trustedIssuersRegStr,
                      TRUSTED_ISSUERS_REGISTRY_ABI,
                      provider
                    );

                    // Check Identity contract for claims
                    const IDENTITY_ABI = [
                      "function getClaimIssuersForTopic(uint256) view returns (address[])"
                    ];
                    const identityContract = new ethers.Contract(
                      identityAddress,
                      IDENTITY_ABI,
                      provider
                    );

                    diagnostic += '📋 Claim Verification:\n';
                    for (const topic of requiredTopics) {
                      const topicNum = Number(topic);
                      const topicName = CLAIM_DESCRIPTIONS[topicNum]?.name || `Claim ${topicNum}`;
                      
                      try {
                        const claimIssuers = await identityContract.getClaimIssuersForTopic(topic);
                        diagnostic += `\n  Topic ${topicNum} (${topicName}):\n`;
                        
                        if (claimIssuers.length === 0) {
                          diagnostic += `    ❌ No claim found in your identity\n`;
                        } else {
                          let hasValidIssuer = false;
                          for (const issuer of claimIssuers) {
                            const isTrusted = await trustedIssuersRegistry.isTrustedIssuer(issuer);
                            const canIssueTopic = await trustedIssuersRegistry.hasClaimTopic(issuer, topic);
                            
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
        const adminAddress = token.adminAddress;
        const testAmount = ethers.parseUnits('1', token.decimals);
        const canTransfer = await tokenContract.canTransfer(adminAddress, userAddress, testAmount);
        diagnostic += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        diagnostic += `5️⃣ Can Transfer: ${canTransfer ? '✅ YES' : '❌ NO'}\n`;
        if (!canTransfer) {
          // Check if frozen
          const isFrozen = await tokenContract.isFrozen(userAddress);
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
      console.error('Error checking compliance:', err);
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
    const { ethers } = await import('ethers');
    if (!ethers.isAddress(recipient)) {
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

    let provider: any;
    let signer: any;
    let tokenContract: any;

    try {
      setTransferring(token._id || '');
      setError(null);

      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask is not installed.\n\nPlease install MetaMask to transfer tokens.');
      }

      const { TOKEN_CLONEABLE_ABI } = await import('@/lib/contracts/TokenCloneable');

      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();

      tokenContract = new ethers.Contract(
        token.tokenAddress,
        TOKEN_CLONEABLE_ABI,
        signer
      );

      console.log(`📤 Transferring ${amountNum} ${token.symbol} to ${recipient}`);
      
      const tx = await tokenContract.transfer(recipient, ethers.parseUnits(amountNum.toString(), token.decimals));
      
      await tx.wait();
      
      // Reload balances after successful transfer
      if (tokens.length > 0) {
        loadTokenBalances(tokens);
      }
      
      setError(null);
      alert(`✅ Transfer Successful!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📦 Amount: ${amountNum} ${token.symbol}\n📫 To: ${recipient.substring(0, 10)}...${recipient.substring(recipient.length - 8)}\n\n📜 Transaction Hash:\n${tx.hash}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    } catch (err: any) {
      console.error('Error transferring token:', err);
      
      let errorMsg = '❌ Transfer Failed\n\n';
      
      // Check for specific error messages
      if (err.reason === 'Transfer not compliant' || err.message?.includes('Transfer not compliant')) {
        errorMsg = '🚫 Compliance Check Failed\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        
        // Do detailed diagnostic
        try {
          // Recreate provider/signer/contract if not available
          if (!provider || !signer || !tokenContract) {
            if (typeof window !== 'undefined' && window.ethereum) {
              const { TOKEN_CLONEABLE_ABI } = await import('@/lib/contracts/TokenCloneable');
              provider = new ethers.BrowserProvider(window.ethereum);
              signer = await provider.getSigner();
              tokenContract = new ethers.Contract(
                token.tokenAddress,
                TOKEN_CLONEABLE_ABI,
                provider
              );
            }
          }

          if (!signer || !tokenContract) {
            throw new Error('Cannot access contracts for diagnostic');
          }

          const userAddress = await signer.getAddress();
          const transferAmount = ethers.parseUnits(amountNum.toString(), token.decimals);
          
          // Check if paused
          const isPaused = await tokenContract.paused();
          if (isPaused) {
            errorMsg += '❌ Token is PAUSED by admin\n\n';
            errorMsg += 'The token contract has been paused. Contact the token admin to unpause.\n';
            errorMsg += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━';
          } else {
            // Check if frozen
            const senderFrozen = await tokenContract.isFrozen(userAddress);
            const recipientFrozen = await tokenContract.isFrozen(recipient);
            
            if (senderFrozen) {
              errorMsg += `❌ YOUR account (${userAddress.substring(0, 10)}...) is FROZEN\n\n`;
              errorMsg += 'Contact the token admin to unfreeze your account.\n';
            } else if (recipientFrozen) {
              errorMsg += `❌ RECIPIENT account (${recipient.substring(0, 10)}...) is FROZEN\n\n`;
              errorMsg += 'The recipient\'s account is frozen. They need to contact the token admin.\n';
            } else {
              // Check verification status
              const senderVerified = await tokenContract.isVerified(userAddress);
              const recipientVerified = await tokenContract.isVerified(recipient);
              
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
                const complianceModules = await tokenContract.getComplianceModules();
                if (complianceModules.length > 0) {
                  errorMsg += `🔒 Compliance Modules: ${complianceModules.length}\n`;
                  
                  for (let i = 0; i < complianceModules.length; i++) {
                    const moduleAddr = complianceModules[i];
                    errorMsg += `   Module ${i + 1}: ${moduleAddr.substring(0, 10)}...\n`;
                    
                    try {
                      // Try to call canTransfer on each module
                      const COMPLIANCE_ABI = [
                        "function canTransfer(address,address,uint256) view returns (bool)"
                      ];
                      const module = new ethers.Contract(moduleAddr, COMPLIANCE_ABI, provider);
                      const moduleCanTransfer = await module.canTransfer(userAddress, recipient, transferAmount);
                      if (!moduleCanTransfer) {
                        errorMsg += `      ❌ This module is BLOCKING the transfer\n`;
                      }
                    } catch (moduleErr) {
                      errorMsg += `      ⚠️ Could not check module status\n`;
                    }
                  }
                }
              } catch (modulesErr) {
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
        } catch (diagErr) {
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
      } else if (err.message?.includes('insufficient')) {
        errorMsg += '💸 Insufficient Balance\n\nYou don\'t have enough tokens to transfer';
      } else if (err.message?.includes('execution reverted')) {
        errorMsg += '⚠️ Transaction Reverted\n\nPossible causes:\n• Token is paused by admin\n• Transfer restrictions active\n• Invalid recipient address';
      } else if (err.message?.includes('user rejected')) {
        errorMsg += '🚫 Transaction Cancelled\n\nYou rejected the transaction in MetaMask';
      } else {
        errorMsg += err.message || 'Unknown error occurred';
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
                <a
                  href="/"
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  ← Back to Factory
                </a>
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

        {error && (
          <div className="mb-6 rounded-lg border-2 border-red-300 bg-red-50 p-6 shadow-lg dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <pre className="whitespace-pre-wrap font-sans text-sm text-red-800 dark:text-red-400">
                  {error}
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

