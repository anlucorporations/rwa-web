'use client';

import { Shield, Lock, Globe, Zap, CheckCircle, BarChart3 } from 'lucide-react';
import { ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  gradient: string;
}

function FeatureCard({ icon, title, description, gradient }: FeatureCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700">
      {/* Gradient background on hover */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${gradient}`}
      ></div>

      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
        <div className="text-white">{icon}</div>
      </div>

      {/* Content */}
      <div className="relative space-y-3">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          {description}
        </p>

        {/* Hover indicator */}
        <div className="pt-4 flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
          Learn more
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </div>
    </div>
  );
}

const features: FeatureCardProps[] = [
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Cryptographic Security',
    description:
      'All issuers are verified through cryptographic proof. Immutable records ensure trust at every step.',
    gradient: 'bg-gradient-to-br from-blue-600 to-blue-700',
  },
  {
    icon: <Lock className="w-6 h-6" />,
    title: 'Decentralized Control',
    description:
      'No central authority. Complete transparency with blockchain-backed verification and auditable operations.',
    gradient: 'bg-gradient-to-br from-indigo-600 to-indigo-700',
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: 'Global Access',
    description:
      'Access the registry from anywhere. Join a worldwide network of trusted issuers and verifiers.',
    gradient: 'bg-gradient-to-br from-cyan-600 to-blue-600',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Lightning Fast',
    description:
      'Real-time verification and instant issuer status updates. No delays, no intermediaries.',
    gradient: 'bg-gradient-to-br from-yellow-600 to-orange-600',
  },
  {
    icon: <CheckCircle className="w-6 h-6" />,
    title: 'Claim Topics',
    description:
      'Flexible claim topic system. Issuers can specify exactly which types of claims they verify.',
    gradient: 'bg-gradient-to-br from-green-600 to-emerald-600',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Full Transparency',
    description:
      'Every issuer, claim topic, and transaction is visible on-chain. Complete audit trail.',
    gradient: 'bg-gradient-to-br from-purple-600 to-pink-600',
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative py-20 sm:py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-950 dark:to-gray-900/50"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 top-1/2 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl dark:bg-blue-600/5"></div>
        <div className="absolute -left-32 bottom-1/4 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl dark:bg-indigo-600/5"></div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16 sm:mb-20 text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
            Everything You Need
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            A complete solution for managing trusted issuers with enterprise-grade security and
            blockchain transparency.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div key={index} className="animate-fadeIn" style={{ animationDelay: `${index * 100}ms` }}>
              <FeatureCard {...feature} />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 sm:mt-20 p-8 sm:p-12 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to join the trusted network?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xl mx-auto">
            Get started with our registry today and become part of a decentralized trust ecosystem.
          </p>
          <button className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold transition-all hover:shadow-lg">
            Start Now
            <span>→</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </section>
  );
}
