'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  account?: string;
  isConnected?: boolean;
  onConnectWallet?: () => void;
  onDisconnect?: () => void;
}

export default function Header({
  account,
  isConnected = false,
  onConnectWallet,
  onDisconnect,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const shortenAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <span className="text-white font-bold text-lg">⚡</span>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-gray-900 dark:text-white tracking-tight">
                Trusted Registry
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Secure Issuers
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#issuers"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
            >
              Issuers
            </Link>
            <a
              href="#docs"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
            >
              Docs
            </a>
          </nav>

          {/* Wallet Button */}
          <div className="flex items-center gap-3">
            {isConnected && account ? (
              <div className="hidden sm:flex items-center gap-3">
                <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white font-mono">
                      {shortenAddress(account)}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={onDisconnect}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={onConnectWallet}
                className="hidden sm:flex gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </Button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-3 border-t border-gray-200 dark:border-gray-800 pt-4">
            <Link
              href="#features"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900 rounded-lg transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900 rounded-lg transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#issuers"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900 rounded-lg transition-colors"
            >
              Issuers
            </Link>
            {!isConnected && (
              <Button
                onClick={onConnectWallet}
                className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
