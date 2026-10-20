"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is an on-chain identity?",
    answer:
      "An on-chain identity is a smart contract deployed on the blockchain that stores a user's verified credentials and claims. It serves as a decentralized identity wallet.",
  },
  {
    question: "How is my data secured?",
    answer:
      "Your identity is secured through cryptographic key pairs and smart contract logic. Only you control your private keys, ensuring no one else can modify your identity.",
  },
  {
    question: "Do I need to pay gas fees?",
    answer:
      "Yes, creating and managing on-chain identities requires gas fees. These vary based on network congestion. We use optimizations to minimize costs.",
  },
  {
    question: "What are verifiable claims?",
    answer:
      "Verifiable claims are cryptographic proofs issued by trusted entities (like KYC providers) that attest to certain facts about you, such as identity verification status or accreditation level.",
  },
  {
    question: "Can I use this for real-world applications?",
    answer:
      "Yes! This identity infrastructure is designed for Real World Asset tokenization, enabling compliance, KYC/AML verification, and investor accreditation checks.",
  },
  {
    question: "Which blockchain networks are supported?",
    answer:
      "Currently, we support Ethereum and Besu networks. Support for additional networks is coming soon.",
  },
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Everything you need to know about on-chain identities
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <button
              key={idx}
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="w-full text-left"
            >
              <div className="rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950/50 dark:hover:border-gray-700">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="flex-1 font-semibold text-gray-900 dark:text-white">
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`h-5 w-5 flex-shrink-0 text-cyan-700 transition-transform dark:text-cyan-400 ${
                      openIdx === idx ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {/* Answer */}
                {openIdx === idx && (
                  <p className="mt-4 text-gray-600 dark:text-gray-400">
                    {faq.answer}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Support CTA */}
        <div className="mt-12 rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-8 text-center dark:border-gray-800 dark:from-gray-900/50 dark:to-gray-950/50">
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Can&apos;t find what you&apos;re looking for?
          </p>
          <a
            href="mailto:support@codecrypto.dev"
            className="inline-flex items-center gap-2 font-semibold text-cyan-700 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
          >
            Contact our support team →
          </a>
        </div>
      </div>
    </section>
  );
}
