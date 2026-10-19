/**
 * Issuer Requests List Component
 * 
 * Displays claim requests for the connected issuer
 */

'use client';

import { useState } from 'react';
import { ClaimRequest } from '@/types/claim-request';
import { useIssuerRequestsQuery } from '@/lib/queries';

interface IssuerRequestsListProps {
  issuerAddress: string;
  onSelectRequest: (request: ClaimRequest) => void;
}

export default function IssuerRequestsList({ issuerAddress, onSelectRequest }: IssuerRequestsListProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const {
    data: requests = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useIssuerRequestsQuery(issuerAddress, filter);

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

  const getPendingCount = () => {
    return requests.filter(r => r.status === 'pending').length;
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <p className="text-center text-gray-600 dark:text-gray-400">
          Loading requests...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Claim Requests ({requests.length})
          </h2>
          {getPendingCount() > 0 && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              {getPendingCount()} pending approval
            </p>
          )}
        </div>
        <button
          onClick={() => void refetch()}
          className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['pending', 'all', 'approved', 'rejected'] as const).map((tab) => (
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
              ? 'No requests yet.'
              : `No ${filter} requests found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request._id}
              onClick={() => onSelectRequest(request)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(request.status)}`}>
                      {getStatusIcon(request.status)} {request.status.toUpperCase()}
                    </span>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Topic {request.claimTopic}
                    </span>
                    {request.documentFileId && (
                      <span className="text-xs text-gray-500">
                        📎 Document attached
                      </span>
                    )}
                    {request.signature && (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
                        ✍️ Signed
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Requester:
                      </p>
                      <code className="block break-all text-xs text-gray-900 dark:text-white">
                        {request.requesterAddress}
                      </code>
                    </div>
                    
                    {request.message && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Message:
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {request.message.length > 100 
                            ? `${request.message.substring(0, 100)}...` 
                            : request.message}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="ml-4">
                  <span className="text-2xl">👉</span>
                </div>
              </div>
              
              <div className="mt-3 border-t border-gray-200 pt-2 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Created: {formatDate(request.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

