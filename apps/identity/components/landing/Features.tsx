"use client";

const features = [
  {
    title: "Identity Registry",
    icon: "🏛️",
    description:
      "Central registry that maps wallet addresses to their identity contracts. Single source of truth for on-chain identity verification.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Identity Contract",
    icon: "📋",
    description:
      "Personal smart contract storing all verified claims and credentials. Each user controls their own identity data.",
    color: "from-cyan-500 to-teal-500",
  },
  {
    title: "Verifiable Claims",
    icon: "✍️",
    description:
      "Cryptographically signed credentials from trusted issuers. Represents KYC, accreditations, and compliance validation.",
    color: "from-indigo-500 to-blue-500",
  },
  {
    title: "Trusted Issuers",
    icon: "🏢",
    description:
      "Decentralized registry of authorized claim issuers. Only registered issuers can issue valid claims.",
    color: "from-purple-500 to-pink-500",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl">
            The Complete Identity Stack
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            Four interconnected components working together to create a robust,
            decentralized identity infrastructure.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((feature, idx) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 transition-all hover:border-gray-300 hover:shadow-xl dark:border-gray-800 dark:bg-gray-950/50 dark:hover:border-gray-700"
              style={{
                animationDelay: `${idx * 100}ms`,
              }}
            >
              {/* Gradient Background */}
              <div
                className={`absolute inset-0 -z-10 bg-gradient-to-br ${feature.color} opacity-0 transition-opacity group-hover:opacity-5`}
              />

              {/* Icon */}
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-2xl dark:bg-gray-800">
                {feature.icon}
              </div>

              {/* Content */}
              <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>

              {/* Accent Line */}
              <div
                className={`mt-4 h-1 w-0 rounded-full bg-gradient-to-r ${feature.color} transition-all group-hover:w-8`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
