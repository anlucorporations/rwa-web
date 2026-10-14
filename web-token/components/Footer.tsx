'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
                <span className="text-sm font-bold text-white">⬡</span>
              </div>
              <span className="font-bold text-white">RWA Factory</span>
            </div>
            <p className="text-sm">Create compliant Real World Asset tokens with minimal gas.</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/factory" className="transition hover:text-emerald-400">
                  Token Factory
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="transition hover:text-emerald-400">
                  Marketplace
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="transition hover:text-emerald-400 cursor-default">
                  Documentation
                </span>
              </li>
              <li>
                <span className="transition hover:text-emerald-400 cursor-default">
                  Contracts
                </span>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="transition hover:text-emerald-400 cursor-default">
                  Privacy
                </span>
              </li>
              <li>
                <span className="transition hover:text-emerald-400 cursor-default">
                  Terms
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 flex items-center justify-between">
          <p className="text-sm text-slate-400">© 2026 RWA Token Factory. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="text-slate-400 transition hover:text-white cursor-default">
              Twitter
            </span>
            <span className="text-slate-400 transition hover:text-white cursor-default">
              GitHub
            </span>
            <span className="text-slate-400 transition hover:text-white cursor-default">
              Discord
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
