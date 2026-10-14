"use client";

import { useWallet } from "@/contexts/WalletContext";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const { account, connectWallet, isConnecting } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
            <span className="text-lg font-bold text-white">⬡</span>
          </div>
          <span className="font-bold tracking-tight text-gray-900 dark:text-white">
            RWA Identity
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden gap-8 md:flex">
          <a
            href="#features"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            How It Works
          </a>
          <a
            href="#faq"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            FAQ
          </a>
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          {account ? (
            <Link
              href="/app"
              className="inline-flex h-10 items-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 font-medium text-white transition-all hover:shadow-lg"
            >
              {shortAddress}
            </Link>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="inline-flex h-10 items-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 font-medium text-white transition-all hover:shadow-lg hover:shadow-cyan-500/50 disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-gray-900 dark:text-white" />
            ) : (
              <Menu className="h-5 w-5 text-gray-900 dark:text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
          <nav className="flex flex-col gap-4">
            <a
              href="#features"
              className="text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              How It Works
            </a>
            <a
              href="#faq"
              className="text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              FAQ
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
