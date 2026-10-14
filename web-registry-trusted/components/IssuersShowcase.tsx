'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users, CheckCircle, Zap } from 'lucide-react';

interface IssuerStats {
  totalIssuers: number;
  activeIssuers: number;
  verifiedClaims: number;
  networkUptime: number;
}

interface IssuersShowcaseProps {
  stats?: IssuerStats;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string | number;
  trend?: string;
}) => (
  <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700">
    <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br from-blue-600 to-indigo-600 transition-opacity"></div>

    <div className="relative space-y-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
        <Icon className="w-6 h-6 text-white" />
      </div>

      <div>
        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{label}</p>
        <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
        {trend && (
          <p className="text-green-600 dark:text-green-400 text-sm font-medium mt-2">
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {trend}
            </span>
          </p>
        )}
      </div>
    </div>
  </div>
);

export default function IssuersShowcase({ stats }: IssuersShowcaseProps) {
  const [displayStats, setDisplayStats] = useState<IssuerStats>({
    totalIssuers: 0,
    activeIssuers: 0,
    verifiedClaims: 0,
    networkUptime: 0,
  });

  useEffect(() => {
    if (stats) {
      setDisplayStats(stats);
    }
  }, [stats]);

  return (
    <section
      id="issuers"
      className="relative py-20 sm:py-24 lg:py-32 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl dark:bg-indigo-600/5"></div>
        <div className="absolute -left-32 top-1/2 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl dark:bg-blue-600/5"></div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 sm:mb-20">
          <div className="max-w-2xl">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              Growing Trust Network
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
              Join a thriving ecosystem of verified issuers. Real-time statistics from our blockchain
              network.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4 mb-16 sm:mb-20">
          <StatCard
            icon={Users}
            label="Total Issuers"
            value={displayStats.totalIssuers}
            trend="+12% this month"
          />
          <StatCard
            icon={CheckCircle}
            label="Active Issuers"
            value={displayStats.activeIssuers}
            trend="All operational"
          />
          <StatCard
            icon={Zap}
            label="Verified Claims"
            value={displayStats.verifiedClaims.toLocaleString()}
            trend="+234 this week"
          />
          <StatCard
            icon={TrendingUp}
            label="Network Uptime"
            value={`${displayStats.networkUptime}%`}
            trend="99.99% SLA"
          />
        </div>

        {/* Featured Issuers */}
        <div>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Featured Issuers
          </h3>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Issuer 1 */}
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br from-blue-600 to-indigo-600 transition-opacity"></div>

              <div className="relative space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-lg">
                  KY
                </div>

                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">KYC Provider</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Verified Know Your Customer claims with global coverage
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 text-xs font-semibold">
                    ✓ Verified
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Topic: 1</span>
                </div>
              </div>
            </div>

            {/* Issuer 2 */}
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br from-indigo-600 to-purple-600 transition-opacity"></div>

              <div className="relative space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white font-bold text-lg">
                  AM
                </div>

                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">AML Provider</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Anti-Money Laundering verification and compliance checks
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 text-xs font-semibold">
                    ✓ Verified
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Topic: 2</span>
                </div>
              </div>
            </div>

            {/* Issuer 3 */}
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br from-cyan-600 to-blue-600 transition-opacity"></div>

              <div className="relative space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center text-white font-bold text-lg">
                  CR
                </div>

                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">Credit Rating</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Professional credit assessment and financial verification services
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 text-xs font-semibold">
                    ✓ Verified
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Topic: 7</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* View All Link */}
        <div className="mt-12 text-center">
          <button className="inline-flex items-center gap-2 px-6 py-3 text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
            View All Issuers
            <span>→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
