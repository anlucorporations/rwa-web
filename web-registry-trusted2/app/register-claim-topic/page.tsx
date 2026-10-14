'use client';

import { useState } from 'react';
import Link from 'next/link';
import { addClaimTopic, isOwner } from '@/lib/contractCalls';
import { switchToBesuNetwork } from '@/lib/web3';

export default function RegisterClaimTopic() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [topicId, setTopicId] = useState('');
  const [topicName, setTopicName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const handleConnectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        await switchToBesuNetwork();
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        setWalletAddress(accounts[0]);
        setIsConnected(true);
        setMessage(null);
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to connect wallet' });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOwner(walletAddress)) {
      setMessage({
        type: 'error',
        text: 'Only the contract owner can register claim topics',
      });
      return;
    }

    if (!topicId || !topicName) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    if (isNaN(parseInt(topicId)) || parseInt(topicId) <= 0) {
      setMessage({ type: 'error', text: 'Topic ID must be a positive number' });
      return;
    }

    setLoading(true);
    try {
      const hash = await addClaimTopic(parseInt(topicId), topicName);
      setMessage({
        type: 'success',
        text: `Claim topic registered successfully! Transaction: ${hash.slice(0, 10)}...`,
      });
      setTopicId('');
      setTopicName('');
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to register claim topic',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold hover:text-gray-600">
            RegistryChain
          </Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="text-gray-700 hover:text-black">
              Dashboard
            </Link>
            <Link href="/register-issuer" className="text-gray-700 hover:text-black">
              Register Issuer
            </Link>
            <Link href="/register-claim-topic" className="text-gray-700 hover:text-black font-semibold">
              Register Topic
            </Link>
            <Link href="/manage-issuer-claims" className="text-gray-700 hover:text-black">
              Manage Claims
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Register Claim Topic</h1>

        {!isConnected ? (
          <div className="p-6 bg-gray-50 border border-gray-200 rounded text-center">
            <p className="text-gray-700 mb-4">Connect your MetaMask wallet to register a claim topic</p>
            <button
              onClick={handleConnectWallet}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Connect MetaMask
            </button>
          </div>
        ) : (
          <>
            {/* Wallet Info */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded mb-6">
              <p className="text-sm text-gray-600 mb-1">Connected Wallet</p>
              <code className="text-sm text-gray-700">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </code>
              <div className="mt-2">
                {isOwner(walletAddress) ? (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✓ Owner Access</span>
                ) : (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">✗ Not Owner</span>
                )}
              </div>
            </div>

            {/* Form */}
            {isOwner(walletAddress) ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Topic ID</label>
                  <input
                    type="number"
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                    placeholder="e.g., 1"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Topic Name</label>
                  <input
                    type="text"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    placeholder="e.g., Know Your Customer"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                {message && (
                  <div
                    className={`p-3 rounded text-sm ${
                      message.type === 'success'
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Registering...' : 'Register Claim Topic'}
                </button>
              </form>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded">
                Only the contract owner can register claim topics. Current owner: 0xf39F...b92266
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
