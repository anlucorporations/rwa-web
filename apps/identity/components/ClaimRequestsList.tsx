/**
 * Claim Requests List Component
 * 
 * Displays a list of claim requests with their status
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClaimRequest } from '@/types/claim-request';
import RequestDetailModal from './RequestDetailModal';
import { claimExists } from '@/lib/identity-claims';
import { useClaimRequestsQuery } from '@/lib/queries';
import { ZERO_ADDRESS } from '@rwa/shared/network';

interface ClaimRequestsListProps {
  userAddress: string;
  refreshTrigger: number;
  identityAddress: string;
  onClaimAdded?: () => void;
}

export default function ClaimRequestsList({ userAddress, refreshTrigger, identityAddress, onClaimAdded }: ClaimRequestsListProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const {
    data: requests = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useClaimRequestsQuery(userAddress, filter, refreshTrigger);
  const [selectedRequest, setSelectedRequest] = useState<ClaimRequest | null>(null);
  const [claimsInContract, setClaimsInContract] = useState<Set<string>>(new Set());

  const checkClaimsInContract = useCallback(async () => {
    if (!identityAddress || identityAddress === ZERO_ADDRESS) {
      return;
    }

    try {
            const claimsSet = new Set<string>();

      // Check each approved request
      const approvedRequests = requests.filter(r => r.status === 'approved');
      
      await Promise.all(
        approvedRequests.map(async (request) => {
          try {
            const topic = Number(request.claimTopic);
            const issuer = request.issuerAddress;
            const exists = await claimExists(identityAddress, topic, issuer);
            
            if (exists) {
              const claimKey = `${topic}-${issuer.toLowerCase()}`;
              claimsSet.add(claimKey);
                          }
          } catch (err) {
                      }
        })
      );

      setClaimsInContract(claimsSet);
          } catch (err) {
          }
  }, [requests, identityAddress]);

  useEffect(() => {
    if (requests.length > 0 && identityAddress && identityAddress !== ZERO_ADDRESS) {
      checkClaimsInContract();
    }
  }, [requests, identityAddress, checkClaimsInContract]);

  const isClaimInContract = (request: ClaimRequest): boolean => {
    if (request.status !== 'approved') {
      return false;
    }
    const claimKey = `${Number(request.claimTopic)}-${request.issuerAddress.toLowerCase()}`;
    return claimsInContract.has(claimKey);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: '⏳',
      approved: '✅',
      rejected: '❌',
    };
    
    return icons[status as keyof typeof icons] || '⏳';
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <p className="text-center text-gray-600 dark:text-gray-400">
          Loading claim requests...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          My Claim Requests ({requests.length})
        </h2>
        <button
          onClick={() => void refetch()}
          className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab
                ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {queryError && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-400">{queryError.message}</p>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'all'
              ? 'No claim requests yet. Submit your first request above!'
              : `No ${filter} requests found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request, index) => (
            <div
              key={request._id || index}
              onClick={() => setSelectedRequest(request)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(request.status)}`}>
                      {getStatusIcon(request.status)} {request.status.toUpperCase()}
                    </span>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Topic {request.claimTopic}
                    </span>
                    {isClaimInContract(request) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        ⬆️ In Identity Contract
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Issuer Address:
                      </p>
                      <code className="block break-all text-sm text-gray-900 dark:text-white">
                        {request.issuerAddress}
                      </code>
                    </div>
                    
                    {request.message && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Message:
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {request.message}
                        </p>
                      </div>
                    )}
                    
                    {request.documentFileId && (
                      <div className="mt-2">
                        <a
                          href={`/api/download/${request.documentFileId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          📎 {request.documentName || 'View Document'}
                          {request.documentSize && (
                            <span className="text-xs text-gray-500">
                              ({(request.documentSize / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </a>
                      </div>
                    )}
                    
                    {request.signature && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          ✍️ Digitally signed by you
                        </p>
                      </div>
                    )}
                    
                    {request.issuerSignature && request.status !== 'pending' && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-green-600 dark:text-green-400">
                          ✅ Reviewed & signed by issuer
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Created: {formatDate(request.createdAt)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Updated: {formatDate(request.updatedAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          identityAddress={identityAddress}
          onClaimAdded={async () => {
            setSelectedRequest(null);
            await refetch();
            // Check claims again after adding (wait a bit for blockchain to update)
            setTimeout(() => {
              checkClaimsInContract();
            }, 1500);
            if (onClaimAdded) onClaimAdded();
          }}
        />
      )}
    </div>
  );
}

