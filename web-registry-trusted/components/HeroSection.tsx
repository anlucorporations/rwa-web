'use client';

import { ArrowRight, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface HeroSectionProps {
  isConnected?: boolean;
  onConnectWallet?: () => void;
}

export default function HeroSection({
  isConnected = false,
  onConnectWallet,
}: HeroSectionProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative min-h-[85vh] overflow-hidden bg-gradient-to-b from-white via-blue-50/30 to-transparent dark:from-gray-950 dark:via-blue-950/10 dark:to-transparent">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Top right orb */}
        <div
          className="absolute -right-40 -top-40 w-80 h-80 bg-gradient-to-b from-blue-400/20 to-indigo-400/10 rounded-full blur-3xl"
          style={{
            transform: `translateY(${scrollY * 0.3}px)`,
          }}
        ></div>

        {/* Bottom left orb */}
        <div
          className="absolute -left-40 bottom-0 w-96 h-96 bg-gradient-to-t from-indigo-400/10 to-blue-400/5 rounded-full blur-3xl"
          style={{
            transform: `translateY(${scrollY * 0.2}px)`,
          }}
        ></div>

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10"></div>
      </div>

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-32 sm:pb-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          {/* Left Column - Text */}
          <div className="flex flex-col gap-8 lg:gap-10">
            {/* Badge */}
            <div className="w-fit">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-200 dark:border-blue-800 rounded-full text-sm font-semibold text-blue-900 dark:text-blue-200">
                <Zap className="w-4 h-4" />
                Powered by Blockchain
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 dark:text-white leading-[1.1]">
                Trust Through
                <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Transparency
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 font-light leading-relaxed max-w-lg">
                A decentralized registry of trusted issuers. Secure, transparent, and powered by blockchain technology.
              </p>
            </div>

            {/* Description */}
            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-lg">
              Establish trust in a decentralized world. Manage and verify trusted issuers with cryptographic proof and transparent claim verification.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {isConnected ? (
                <a
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-lg px-8 py-6 rounded-xl shadow-2xl hover:shadow-3xl transition-all"
                >
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </a>
              ) : (
                <Button
                  onClick={onConnectWallet}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-lg px-8 py-6 rounded-xl shadow-2xl hover:shadow-3xl transition-all gap-2"
                >
                  Connect Wallet
                  <ArrowRight className="w-5 h-5" />
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-gray-300 hover:border-blue-600 dark:border-gray-700 dark:hover:border-blue-500 text-gray-900 dark:text-white font-semibold text-lg px-8 py-6 rounded-xl transition-all"
              >
                Read Documentation
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200 dark:border-gray-800">
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">100%</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Decentralized</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">∞</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Scalable</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">✓</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Verifiable</p>
              </div>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="relative hidden lg:block">
            <div className="relative w-full aspect-square">
              {/* Card 1 - Back */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200/50 dark:border-blue-800/50 rounded-2xl p-6 transform rotate-6 translate-y-8">
                <div className="space-y-4">
                  <div className="h-12 w-24 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-lg opacity-30"></div>
                  <div className="space-y-3">
                    <div className="h-3 w-full bg-gradient-to-r from-blue-400 to-transparent rounded opacity-20"></div>
                    <div className="h-3 w-4/5 bg-gradient-to-r from-blue-400 to-transparent rounded opacity-20"></div>
                  </div>
                </div>
              </div>

              {/* Card 2 - Middle */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/15 to-indigo-400/15 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 transform -rotate-3 translate-y-4 backdrop-blur-sm">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Verified Issuer</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Status: Active</p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <div className="h-3 w-full bg-gradient-to-r from-blue-200 to-transparent rounded dark:from-blue-900"></div>
                    <div className="h-3 w-3/4 bg-gradient-to-r from-blue-200 to-transparent rounded dark:from-blue-900"></div>
                  </div>
                </div>
              </div>

              {/* Card 3 - Front */}
              <div className="absolute inset-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Issuers Registry</h3>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-sm font-bold">
                      ✓
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Trust Network</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">24 Active Issuers</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Transactions</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">1,234 Verified</p>
                      </div>
                    </div>
                  </div>

                  <button className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm hover:shadow-lg transition-all">
                    View Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes grid {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 40px 40px;
          }
        }

        .bg-grid-pattern {
          background-image:
            linear-gradient(
              rgba(59, 130, 246, 0.1) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(59, 130, 246, 0.1) 1px,
              transparent 1px
            );
          background-size: 40px 40px;
        }
      `}</style>
    </div>
  );
}
