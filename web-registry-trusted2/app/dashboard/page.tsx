'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getAllIssuers,
  getIssuersCount,
  getAllClaimTopics,
  getClaimTopicsCount,
  getIssuerDetails,
  getClaimTopicDetails,
  getIssuerClaimTopics
} from '@/lib/contractCalls';

interface IssuerInfo {
  address: string;
  name: string;
  claimTopicIds: bigint[];
}

interface ClaimTopicInfo {
  id: bigint;
  name: string;
}

export default function Dashboard() {
  const [issuerCount, setIssuerCount] = useState<number>(0);
  const [claimTopicCount, setClaimTopicCount] = useState<number>(0);
  const [issuers, setIssuers] = useState<IssuerInfo[]>([]);
  const [claimTopics, setClaimTopics] = useState<ClaimTopicInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      console.log('[Dashboard] Fetching data...');
      setLoading(true);
      const [issuerCnt, claimTopicCnt, issuerAddresses, topicIds] = await Promise.all([
        getIssuersCount(),
        getClaimTopicsCount(),
        getAllIssuers(),
        getAllClaimTopics(),
      ]);
      console.log('[Dashboard] Data loaded successfully');
      setIssuerCount(issuerCnt);
      setClaimTopicCount(claimTopicCnt);

      // Fetch issuer details (name + address + claim topics)
      const issuerDetails: IssuerInfo[] = [];
      for (const address of issuerAddresses) {
        const details = await getIssuerDetails(address);
        const claimTopics = await getIssuerClaimTopics(address);
        if (details) {
          issuerDetails.push({
            address,
            name: details.name,
            claimTopicIds: claimTopics,
          });
        }
      }
      setIssuers(issuerDetails);

      // Fetch claim topic details (name + id)
      const topicDetails: ClaimTopicInfo[] = [];
      for (const id of topicIds) {
        const details = await getClaimTopicDetails(id);
        if (details) {
          topicDetails.push({
            id,
            name: details.name,
          });
        }
      }
      setClaimTopics(topicDetails);

      setError(null);
    } catch (err) {
      setError('Failed to load registry data. Make sure Anvil is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[Dashboard] useEffect mounted - calling fetchData');
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold hover:text-gray-600">
            RegistryChain
          </Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="text-gray-700 hover:text-black font-semibold">
              Dashboard
            </Link>
            <Link href="/register-issuer" className="text-gray-700 hover:text-black">
              Register Issuer
            </Link>
            <Link href="/register-claim-topic" className="text-gray-700 hover:text-black">
              Register Topic
            </Link>
            <Link href="/manage-issuer-claims" className="text-gray-700 hover:text-black">
              Manage Claims
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Registry Dashboard</h1>

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-8">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-600">Loading registry data...</p>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="p-6 border border-gray-200 rounded">
                <p className="text-gray-600 mb-2">Total Issuers</p>
                <p className="text-4xl font-bold">{issuerCount}</p>
              </div>
              <div className="p-6 border border-gray-200 rounded">
                <p className="text-gray-600 mb-2">Total Claim Topics</p>
                <p className="text-4xl font-bold">{claimTopicCount}</p>
              </div>
            </div>

            {/* Issuers List */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Trusted Issuers</h2>
              {issuers.length === 0 ? (
                <p className="text-gray-600">No issuers registered yet</p>
              ) : (
                <div className="border border-gray-200 rounded overflow-hidden">
                  {issuers.map((issuer, index) => (
                    <div
                      key={index}
                      className="px-4 py-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{issuer.name}</p>
                          <code className="text-xs text-gray-500">
                            {issuer.address.slice(0, 6)}...{issuer.address.slice(-4)}
                          </code>
                        </div>
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">Verified</span>
                      </div>
                      {issuer.claimTopicIds.length > 0 && (
                        <div className="mt-2 pl-0">
                          <p className="text-xs text-gray-600 mb-1">Claim Topics: {issuer.claimTopicIds.length}</p>
                          <div className="flex flex-wrap gap-1">
                            {issuer.claimTopicIds.map((topicId) => (
                              <span key={topicId.toString()} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                Topic ID: {topicId.toString()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Claim Topics List */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Claim Topics</h2>
              {claimTopics.length === 0 ? (
                <p className="text-gray-600">No claim topics registered yet</p>
              ) : (
                <div className="border border-gray-200 rounded overflow-hidden">
                  {claimTopics.map((topic, index) => (
                    <div
                      key={index}
                      className="px-4 py-3 border-b border-gray-200 last:border-b-0 flex justify-between items-center hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{topic.name}</p>
                        <code className="text-xs text-gray-500">
                          ID: {topic.id.toString()}
                        </code>
                      </div>
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded">Active</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>
          </>
        )}
      </main>
    </div>
  );
}
