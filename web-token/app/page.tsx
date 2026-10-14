'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: '⚡',
    title: 'Gas Efficient',
    description: 'EIP-1167 Minimal Proxy Pattern saves 98.3% on deployment costs',
    metric: '98.3% Savings'
  },
  {
    icon: '🔐',
    title: 'Compliance Automated',
    description: 'Built-in KYC, accreditation, and jurisdiction verification',
    metric: 'Zero Manual Work'
  },
  {
    icon: '🪙',
    title: 'Real World Assets',
    description: 'Create fully-compliant RWA tokens with investor claims',
    metric: 'Production Ready'
  },
  {
    icon: '⛓️',
    title: 'Blockchain Native',
    description: 'Integrated with identity registries and compliance aggregators',
    metric: 'Decentralized'
  }
];

const stats = [
  { label: 'Gas Savings', value: '98.3%', subtext: 'vs. Full Deployment' },
  { label: 'Claim Types', value: '5+', subtext: 'KYC, Accreditation, etc.' },
  { label: 'Compliance', value: 'Automated', subtext: 'Zero Configuration' },
];

export default function HomePage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    setMousePosition({ x: clientX, y: clientY });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden" onMouseMove={handleMouseMove}>
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-96 h-96 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-full filter blur-3xl"
          style={{
            left: `${mousePosition.x - 192}px`,
            top: `${mousePosition.y - 192}px`,
            transition: 'all 0.3s ease-out',
          }}
        />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-blue-500/10 to-transparent rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gradient-to-t from-emerald-500/10 to-transparent rounded-full filter blur-3xl" />
      </div>

      <Header />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center px-4 pt-20">
          <div className="max-w-6xl mx-auto text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm">
              <span className="text-sm text-emerald-300">✨ RWA Solutions</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              Create Compliant
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-blue-500 to-emerald-400 bg-clip-text text-transparent">
                Real World Assets
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto">
              Deploy tokenized real-world assets with automated compliance, minimal gas costs, and built-in investor verification.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/factory">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0">
                  🚀 Create Token
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button size="lg" className="border-2 border-emerald-500 text-white hover:bg-emerald-500/20 bg-transparent">
                  🏪 View Marketplace
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-4 pt-12 max-w-2xl mx-auto">
              {stats.map((stat, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="text-2xl font-bold text-emerald-400">{stat.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Powerful Features
              </h2>
              <p className="text-slate-400 text-lg">Everything you need to launch compliant RWA tokens</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature, idx) => (
                <Card key={idx} className="border-emerald-500/40 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 backdrop-blur hover:border-emerald-500/70 hover:from-slate-900/95 hover:via-slate-950/98 hover:to-slate-900/95 transition-all duration-300 cursor-pointer group shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20">
                  <CardHeader>
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
                    <CardTitle className="text-white">{feature.title}</CardTitle>
                    <CardDescription className="text-slate-300">{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-sm font-medium border border-emerald-500/50">
                      {feature.metric}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Why RWA Section */}
        <section id="why" className="py-20 px-4 border-t border-white/10">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left side - Text */}
              <div>
                <h2 className="text-4xl font-bold mb-6">Why Real World Assets?</h2>
                <div className="space-y-4 text-slate-300">
                  <p>
                    Real World Assets unlock trillions in value by bringing physical and traditional assets on-chain. From real estate and commodities to securities and receivables.
                  </p>
                  <p>
                    Our RWA Token Factory removes technical barriers, regulatory complexity, and high costs. Deploy compliant tokens in minutes instead of months.
                  </p>
                  <div className="space-y-3 mt-8">
                    <div className="flex gap-3">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>EIP-1167 Minimal Proxy for 98% gas savings</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Automated compliance with identity registries</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Built-in claim and verification system</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>MongoDB storage for token metadata</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Visual */}
              <div className="relative h-96 rounded-2xl overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 backdrop-blur-sm p-8 flex items-center justify-center">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 left-0 w-40 h-40 bg-emerald-500 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 right-0 w-40 h-40 bg-blue-500 rounded-full blur-3xl" />
                </div>
                <div className="relative z-10 text-center">
                  <div className="text-6xl mb-4">⬡</div>
                  <p className="text-sm text-slate-400">
                    EIP-1167 Minimal Proxy Architecture
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 border-t border-white/10">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to Launch?
            </h2>
            <p className="text-xl text-slate-300">
              Create your first RWA token in minutes. No setup required.
            </p>
            <Link href="/factory">
              <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0 mx-auto">
                Get Started →
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
