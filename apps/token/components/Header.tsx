'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-900/40 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
            <span className="text-lg font-bold text-white">⬡</span>
          </div>
          <span className="hidden text-xl font-bold text-white sm:inline">
            RWA <span className="bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">Factory</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          <Link href="/#features" className="text-sm text-slate-300 transition hover:text-white">
            Features
          </Link>
          <Link href="/#why" className="text-sm text-slate-300 transition hover:text-white">
            Why RWA
          </Link>
          <Link href="/marketplace" className="text-sm text-slate-300 transition hover:text-white">
            Marketplace
          </Link>
          <Link href="/factory" className="rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 px-3 py-2 text-sm font-semibold text-white inline-block">
            Launch App
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-white"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </nav>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="border-t border-white/10 bg-slate-800/50 backdrop-blur md:hidden">
          <div className="flex flex-col gap-3 px-4 py-4">
            <Link href="/#features" className="text-sm text-slate-300 transition hover:text-white">
              Features
            </Link>
            <Link href="/#why" className="text-sm text-slate-300 transition hover:text-white">
              Why RWA
            </Link>
            <Link href="/marketplace" className="text-sm text-slate-300 transition hover:text-white">
              Marketplace
            </Link>
            <Link href="/factory" className="block w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white text-center">
              Launch App
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
