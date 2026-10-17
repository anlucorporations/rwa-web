/**
 * Example Component: Token Clone Factory
 * 
 * This component demonstrates how to interact with the TokenCloneFactory contract.
 * It shows how to:
 * - View all created tokens
 * - Create new tokens
 * - Query tokens by admin
 * 
 * To use this in your app:
 * 1. Install ethers.js: npm install ethers
 * 2. Import and use this component in your pages
 */

'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import {
  TOKEN_CLONE_FACTORY_ADDRESS,
  TOKEN_CLONE_FACTORY_ABI,
  TOKEN_IMPLEMENTATION_ADDRESS,
  NETWORK_CONFIG,
  GAS_SAVINGS,
} from '@/lib/contracts';

interface TokenInfo {
  address: string;
  index: number;
}

export default function TokenFactoryExample() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    decimals: '18',
    admin: '',
  });

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const factory = new ethers.Contract(
        TOKEN_CLONE_FACTORY_ADDRESS,
        TOKEN_CLONE_FACTORY_ABI,
        provider
      );

      // Get total tokens
      const total = await factory.getTotalTokens();
      setTotalTokens(Number(total));

      // Get all token addresses
      const tokenList: TokenInfo[] = [];
      for (let i = 0; i < Number(total); i++) {
        const address = await factory.getTokenAt(i);
        tokenList.push({ address, index: i });
      }

      setTokens(tokenList);
    } catch (err) {
      console.error('Error loading tokens:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createToken = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to create tokens!');
      return;
    }

    if (!formData.name || !formData.symbol || !formData.admin) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const factory = new ethers.Contract(
        TOKEN_CLONE_FACTORY_ADDRESS,
        TOKEN_CLONE_FACTORY_ABI,
        signer
      );

      console.log('Creating token...');
      const tx = await factory.createToken(
        formData.name,
        formData.symbol,
        parseInt(formData.decimals),
        formData.admin
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Token created!', receipt);

      // Find the TokenCreated event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === 'TokenCreated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = factory.interface.parseLog(event);
        alert(`Token created successfully!\nAddress: ${parsed?.args.token}`);
      }

      // Reload tokens
      await loadTokens();

      // Reset form
      setFormData({
        name: '',
        symbol: '',
        decimals: '18',
        admin: '',
      });
    } catch (err: any) {
      console.error('Error creating token:', err);
      setError(err.message || 'Failed to create token');
      alert('Error creating token: ' + (err.message || 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Auto-fill admin address
      setFormData(prev => ({ ...prev, admin: address }));
      
      alert(`Connected: ${address}`);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      alert('Failed to connect wallet');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading token factory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Token Clone Factory</h2>
        <button
          onClick={loadTokens}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <h3 className="text-lg font-semibold text-red-800">Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Factory Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">Factory Address:</p>
          <code className="text-xs break-all">{TOKEN_CLONE_FACTORY_ADDRESS}</code>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">Implementation:</p>
          <code className="text-xs break-all">{TOKEN_IMPLEMENTATION_ADDRESS}</code>
        </div>
      </div>

      {/* Gas Savings Info */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <h3 className="mb-2 font-semibold text-green-900">⚡ Gas Savings</h3>
        <div className="grid gap-2 md:grid-cols-3">
          <div>
            <p className="text-sm text-green-800">Clone Deployment:</p>
            <p className="font-bold text-green-900">{GAS_SAVINGS.cloneDeployment}</p>
          </div>
          <div>
            <p className="text-sm text-green-800">Full Deployment:</p>
            <p className="font-bold text-green-900">{GAS_SAVINGS.fullDeployment}</p>
          </div>
          <div>
            <p className="text-sm text-green-800">Total Savings:</p>
            <p className="font-bold text-green-900">{GAS_SAVINGS.savings}</p>
          </div>
        </div>
      </div>

      {/* Create Token Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-xl font-semibold">Create New Token</h3>
        
        <div className="mb-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Token Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., My Security Token"
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Token Symbol *
            </label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              placeholder="e.g., MST"
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Decimals
            </label>
            <input
              type="number"
              value={formData.decimals}
              onChange={(e) => setFormData({ ...formData, decimals: e.target.value })}
              min="0"
              max="18"
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Admin Address *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.admin}
                onChange={(e) => setFormData({ ...formData, admin: e.target.value })}
                placeholder="0x..."
                className="flex-1 rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={connectWallet}
                className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
              >
                Use My Address
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={createToken}
          disabled={creating}
          className={`w-full rounded px-4 py-3 font-semibold text-white ${
            creating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {creating ? 'Creating Token...' : 'Create Token'}
        </button>

        <p className="mt-2 text-xs text-gray-500">
          * You&apos;ll need MetaMask installed and connected to create tokens
        </p>
      </div>

      {/* Tokens List */}
      <div>
        <h3 className="mb-3 text-xl font-semibold">
          Created Tokens ({totalTokens})
        </h3>

        {totalTokens === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">No tokens created yet. Create your first token above!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div
                key={token.index}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">Token #{token.index + 1}</p>
                  <code className="text-xs break-all text-gray-600">{token.address}</code>
                </div>
                <a
                  href={NETWORK_CONFIG.rpcUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Development Note */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h4 className="mb-2 font-semibold text-blue-900">
          💡 Development Note
        </h4>
        <p className="text-sm text-blue-800">
          This factory creates token clones using the EIP-1167 minimal proxy pattern,
          saving ~98.3% gas compared to full deployments. Each token is a separate
          contract with its own admin and configuration.
        </p>
      </div>
    </div>
  );
}

