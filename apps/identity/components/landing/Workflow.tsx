"use client";

export default function Workflow() {
  return (
    <section id="how-it-works" className="relative px-6 py-24 sm:py-32">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-600/10 blur-3xl dark:from-cyan-500/5 dark:to-blue-600/5" />
      </div>

      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl">
            The Identity Flow
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            See how identities are created, registered, and verified on-chain
          </p>
        </div>

        {/* Workflow Steps */}
        <div className="space-y-8">
          {[
            {
              step: "01",
              title: "Connect Wallet",
              description:
                "User connects their blockchain wallet to the identity platform.",
              icon: "🔌",
            },
            {
              step: "02",
              title: "Create Identity",
              description:
                "System creates a new smart contract as user's identity on the blockchain.",
              icon: "⚙️",
            },
            {
              step: "03",
              title: "Register Identity",
              description:
                "Identity contract is registered in the central Identity Registry.",
              icon: "📝",
            },
            {
              step: "04",
              title: "Request Claims",
              description:
                "User requests verifiable claims from trusted issuers.",
              icon: "🎯",
            },
            {
              step: "05",
              title: "Verify Claims",
              description:
                "Issuers verify user information and issue cryptographic claims.",
              icon: "✅",
            },
            {
              step: "06",
              title: "Use Identity",
              description:
                "Identity and claims can now be used in blockchain dApps and services.",
              icon: "🚀",
            },
          ].map((item, idx) => (
            <div key={item.step} className="relative">
              {/* Connecting Line */}
              {idx < 5 && (
                <div className="absolute left-8 top-24 h-12 w-1 bg-gradient-to-b from-cyan-500 to-transparent dark:from-cyan-400" />
              )}

              {/* Step Card */}
              <div className="flex gap-6 sm:gap-8">
                {/* Step Number */}
                <div className="relative z-10 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-lg sm:h-20 sm:w-20">
                  {item.icon}
                </div>

                {/* Content */}
                <div className="flex-1 pt-2 sm:pt-4">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
                      Step {item.step}
                    </span>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 rounded-2xl border border-gray-200 bg-gradient-to-br from-cyan-50 to-blue-50 p-8 text-center dark:border-gray-800 dark:from-cyan-950/30 dark:to-blue-950/30">
          <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
            Ready to Get Started?
          </h3>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            Create your on-chain identity in minutes. No KYC required for basic setup.
          </p>
          <a
            href="/app"
            className="inline-flex h-12 items-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-8 font-semibold text-white transition-all hover:shadow-xl hover:shadow-cyan-500/30 active:scale-95"
          >
            Launch App
          </a>
        </div>
      </div>
    </section>
  );
}
