'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 left-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-amber-500/20 backdrop-blur-md bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center font-serif font-bold text-slate-950">
              RC
            </div>
            <span className="font-serif text-xl font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              RegistryChain
            </span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-400 hover:text-amber-400 transition-colors">
              Features
            </a>
            <a href="#trust" className="text-sm text-gray-400 hover:text-amber-400 transition-colors">
              Trust & Security
            </a>
            <Link
              href="/dashboard"
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold text-sm hover:from-amber-300 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-32">
        <div className="grid grid-cols-2 gap-16 items-center mb-20">
          {/* Left: Content */}
          <div className="space-y-8">
            <div className="inline-block px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm">
              <span className="text-sm text-amber-300 font-medium">Enterprise-Grade Registry</span>
            </div>

            <h1 className="font-serif text-6xl font-bold leading-tight">
              Trusted Issuers,
              <br />
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                On-Chain Authority
              </span>
            </h1>

            <p className="text-xl text-gray-400 leading-relaxed max-w-xl">
              Enterprise registry for managing trusted issuers and claim topics. Immutable, transparent, and secured by Ethereum smart contracts.
            </p>

            <div className="flex gap-4 pt-4">
              <Link
                href="/dashboard"
                className="group px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-bold text-lg hover:from-amber-300 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105"
              >
                Access Dashboard
                <span className="ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span>
              </Link>
              <Link
                href="/register-issuer"
                className="px-8 py-4 rounded-xl border-2 border-amber-500/40 text-white font-semibold text-lg hover:bg-amber-500/10 transition-all"
              >
                Register Issuer
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6 pt-12 border-t border-amber-500/20">
              <div>
                <p className="text-4xl font-bold text-amber-400">100%</p>
                <p className="text-sm text-gray-500">On-Chain Transparency</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-amber-400">Immutable</p>
                <p className="text-sm text-gray-500">Blockchain Records</p>
              </div>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="relative h-96 hidden lg:block">
            {/* Glassmorphism card simulation */}
            <div className="absolute inset-0 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-blue-500/10 backdrop-blur-xl shadow-2xl"></div>

            {/* Inner details */}
            <div className="absolute inset-4 rounded-xl border border-amber-500/10 bg-slate-900/40 backdrop-blur-sm p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-amber-500/20">
                  <span className="text-sm text-gray-500">Total Issuers</span>
                  <span className="text-2xl font-bold text-amber-400">42</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-amber-500/20">
                  <span className="text-sm text-gray-500">Claim Topics</span>
                  <span className="text-2xl font-bold text-amber-400">156</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Network Status</span>
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                </div>
              </div>
            </div>

            {/* Animated accent */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl animate-pulse"></div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative z-10 border-t border-amber-500/20 py-24 bg-gradient-to-b from-transparent to-amber-500/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-serif text-5xl font-bold">
              Built for <span className="text-amber-400">Enterprise</span>
            </h2>
            <p className="text-xl text-gray-400">Everything needed to manage trusted issuers at scale</p>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-md p-8 hover:border-amber-500/50 hover:bg-slate-800/70 transition-all hover:shadow-lg hover:shadow-amber-500/20">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                📋
              </div>
              <h3 className="font-serif text-2xl font-bold mb-3">Issuer Management</h3>
              <p className="text-gray-400">Register, verify, and manage trusted issuers with complete audit trails.</p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-md p-8 hover:border-amber-500/50 hover:bg-slate-800/70 transition-all hover:shadow-lg hover:shadow-amber-500/20">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                🏷️
              </div>
              <h3 className="font-serif text-2xl font-bold mb-3">Claim Topics</h3>
              <p className="text-gray-400">Organize and categorize claims across compliance frameworks.</p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-md p-8 hover:border-amber-500/50 hover:bg-slate-800/70 transition-all hover:shadow-lg hover:shadow-amber-500/20">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                🔐
              </div>
              <h3 className="font-serif text-2xl font-bold mb-3">Blockchain Secured</h3>
              <p className="text-gray-400">Immutable records with Ethereum smart contract guarantees.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="trust" className="relative z-10 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 gap-16 items-center">
            {/* Left side */}
            <div className="space-y-8">
              <h2 className="font-serif text-4xl font-bold leading-tight">
                Trust & <span className="text-amber-400">Transparency</span>
              </h2>
              <p className="text-lg text-gray-400">
                Built on Ethereum for complete transparency. Every issuer, every claim topic, every transaction is immutable and auditable.
              </p>
              <ul className="space-y-4">
                <li className="flex gap-4 items-start">
                  <span className="text-amber-400 text-xl">✓</span>
                  <span className="text-gray-300">Full blockchain transparency</span>
                </li>
                <li className="flex gap-4 items-start">
                  <span className="text-amber-400 text-xl">✓</span>
                  <span className="text-gray-300">Immutable audit trails</span>
                </li>
                <li className="flex gap-4 items-start">
                  <span className="text-amber-400 text-xl">✓</span>
                  <span className="text-gray-300">Smart contract secured</span>
                </li>
                <li className="flex gap-4 items-start">
                  <span className="text-amber-400 text-xl">✓</span>
                  <span className="text-gray-300">Enterprise-grade operations</span>
                </li>
              </ul>
            </div>

            {/* Right side: Visual */}
            <div className="relative">
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-blue-500/10 backdrop-blur-xl p-8 space-y-6">
                <div className="flex items-center gap-3 pb-6 border-b border-amber-500/20">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-400 font-medium">Network Connected</span>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-slate-900/50 border border-amber-500/20">
                    <p className="text-xs text-gray-600 mb-2">Latest Block</p>
                    <p className="font-mono text-sm text-amber-400">0x7f8d9c4e...</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-900/50 border border-amber-500/20">
                    <p className="text-xs text-gray-600 mb-2">Contract Status</p>
                    <p className="font-mono text-sm text-green-400">✓ Verified</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 border-t border-amber-500/20">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="font-serif text-5xl font-bold">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-400">Access the registry and start managing trusted issuers today.</p>
          </div>
          <div className="flex gap-4 justify-center pt-4">
            <Link
              href="/dashboard"
              className="group px-10 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-bold text-lg hover:from-amber-300 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105"
            >
              Access Dashboard Now
              <span className="ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span>
            </Link>
            <Link
              href="/register-issuer"
              className="px-10 py-4 rounded-xl border-2 border-amber-500/40 text-white font-semibold text-lg hover:bg-amber-500/10 transition-all"
            >
              Register New Issuer
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-amber-500/20 bg-gradient-to-b from-transparent to-slate-950/80 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="font-semibold text-amber-400 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/dashboard" className="hover:text-amber-400 transition-colors">Dashboard</Link></li>
                <li><Link href="/register-issuer" className="hover:text-amber-400 transition-colors">Register Issuer</Link></li>
                <li><Link href="/register-claim-topic" className="hover:text-amber-400 transition-colors">Register Topic</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-amber-400 mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-amber-400 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-amber-400 transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-amber-400 transition-colors">Smart Contracts</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-amber-400 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-amber-400 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-amber-400 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-amber-400 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-amber-400 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-amber-400 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-amber-400 transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-amber-400 transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-amber-500/20 pt-8 flex justify-between items-center">
            <p className="text-sm text-gray-600">© 2025 RegistryChain. All rights reserved.</p>
            <p className="text-sm text-gray-600">Built on Ethereum • Enterprise Registry</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
