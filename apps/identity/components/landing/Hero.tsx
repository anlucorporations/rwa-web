"use client";

import Link from "next/link";

export default function Hero() {

  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-32">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 blur-3xl dark:from-cyan-500/10 dark:to-blue-600/10" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 blur-3xl dark:from-indigo-500/10 dark:to-cyan-500/10" />
      </div>

      <div className="mx-auto max-w-4xl">
        {/* Animated Badge */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 dark:border-cyan-900 dark:bg-cyan-950/50">
            <span className="inline-block h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
              On-Chain Identity Infrastructure
            </span>
          </div>
        </div>

        {/* Main Headline */}
        <h1 className="mb-6 text-center text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-cyan-600 bg-clip-text text-transparent dark:from-white dark:via-blue-300 dark:to-cyan-300">
            Digital Identity
          </span>
          <br />
          <span className="text-gray-600 dark:text-gray-400">
            Reimagined for Web3
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mb-8 max-w-2xl text-center text-lg text-gray-600 dark:text-gray-400">
          Create, manage, and verify on-chain identities with cryptographic claims.
          The foundation for real-world asset tokenization and Web3 trust.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/app"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-8 font-semibold text-white transition-all hover:shadow-xl hover:shadow-cyan-500/30 active:scale-95"
          >
            Launch App
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-gray-300 bg-white px-8 font-semibold text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:hover:bg-gray-900"
          >
            Learn More
          </a>
        </div>

        {/* Feature Pills */}
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {[
            "🔐 Cryptographically Secured",
            "⚡ Gas Optimized",
            "🔗 Blockchain Native",
            "✓ Decentralized Verification",
          ].map((feature) => (
            <div
              key={feature}
              className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {feature}
            </div>
          ))}
        </div>

        {/* Highlight Box */}
        <div className="mt-16 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-8 dark:border-gray-800 dark:from-gray-900/50 dark:to-gray-950/50 sm:p-12">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { number: "∞", label: "Scalable" },
              { number: "100%", label: "On-Chain" },
              { number: "0ms", label: "Instant" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-cyan-700 dark:text-cyan-400">
                  {stat.number}
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
