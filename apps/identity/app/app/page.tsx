"use client";

import { useState, useEffect, useCallback } from "react";
import { useChainId, usePublicClient, useWalletClient } from "wagmi";
import { decodeEventLog, type Address } from "viem";
import { useWallet } from "@/contexts/WalletContext";
import { IDENTITY_FACTORY_ADDRESS, IDENTITY_REGISTRY_ADDRESS } from "@/lib/contracts";
import ClaimRequestForm from "@/components/ClaimRequestForm";
import ClaimRequestsList from "@/components/ClaimRequestsList";
import { CLAIM_TOPIC_NAMES, getIdentityClaims } from "@/lib/identity-claims";
import { ValidationError } from "@rwa/shared/errors";
import { IdentityCloneFactoryAbi, IdentityRegistryAbi } from "@rwa/shared/contracts";
import {
  CANONICAL_CHAIN_ID,
  TRUSTED_ISSUERS_REGISTRY_ABI,
  TRUSTED_ISSUERS_REGISTRY_ADDRESS,
  ZERO_ADDRESS,
  assertCanonicalChain,
} from "@rwa/shared/network";
import { getPublicClient } from "@rwa/shared/web3";

/** Normaliza errores de wagmi/viem (sin los códigos de `ethers`). */
function normalizeWalletError(err: unknown): { message: string; reason?: string; code?: string | number } {
  const candidate = err as {
    shortMessage?: string;
    details?: string;
    message?: string;
    reason?: string;
    code?: string | number;
    cause?: { reason?: string; shortMessage?: string; message?: string; code?: string | number };
  };
  const code = candidate?.code ?? candidate?.cause?.code;
  const message =
    candidate?.shortMessage || candidate?.details || candidate?.message || candidate?.cause?.message || '';
  const reason = candidate?.reason || candidate?.cause?.reason || '';
  return { message, reason, code };
}

export default function Home() {
  const { account, isConnecting, connectWallet } = useWallet();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [identityAddress, setIdentityAddress] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [identityClaims, setIdentityClaims] = useState<{ topic: bigint; issuer: string }[]>([]);

  const checkRegistrationStatus = useCallback(async (address: string) => {
    if (!publicClient) return;

    setIsCheckingRegistration(true);
    setError("");
    try {
      // O2.5: la wallet debe estar en la red canónica
      assertCanonicalChain(chainId);

      const registryAddress = IDENTITY_REGISTRY_ADDRESS as Address;
      const registered = await publicClient.readContract({
        address: registryAddress,
        abi: IdentityRegistryAbi,
        functionName: "isRegistered",
        args: [address as Address],
      });

      setIsRegistered(registered);

      if (registered) {
        const identity = await publicClient.readContract({
          address: registryAddress,
          abi: IdentityRegistryAbi,
          functionName: "getIdentity",
          args: [address as Address],
        });
        setIdentityAddress(identity);
      } else {
        setIdentityAddress("");
      }
    } catch (err) {
      setIsRegistered(false);
      setIdentityAddress("");

      if (err instanceof ValidationError) {
        // Red incorrecta: muestra el mensaje del ValidationError de @rwa/shared/network
        setError(err.message);
      } else {
        const info = normalizeWalletError(err);
        setError(
          `Cannot connect to contracts. Make sure your wallet is on the canonical network (chainId: ${CANONICAL_CHAIN_ID}). ${
            info.message || ""
          }`.trim(),
        );
      }
    } finally {
      setIsCheckingRegistration(false);
    }
  }, [publicClient, chainId]);

  // Check registration status when account changes
  useEffect(() => {
    if (account && publicClient) {
      checkRegistrationStatus(account);
    } else {
      // Clear state when disconnected
      setIsRegistered(false);
      setIdentityAddress("");
      setIdentityClaims([]);
    }
  }, [account, publicClient, checkRegistrationStatus]);

  const createIdentity = async () => {
    if (!account || !walletClient || !publicClient) {
      setError("Please connect your wallet first");
      return;
    }

    setIsCreating(true);
    setError("");
    setSuccess("");

    try {
      assertCanonicalChain(chainId);

      const signerAddress = walletClient.account?.address;
      if (!signerAddress) {
        throw new Error("Signer address doesn't match connected account. Please reconnect your wallet.");
      }

      // Verify the signer matches the connected account
      if (signerAddress.toLowerCase() !== account.toLowerCase()) {
        throw new Error("Signer address doesn't match connected account. Please reconnect your wallet.");
      }

      // Step 1: Create identity using IdentityCloneFactory
      setSuccess("Creating identity contract...");

      const hash = await walletClient.writeContract({
        address: IDENTITY_FACTORY_ADDRESS as Address,
        abi: IdentityCloneFactoryAbi,
        functionName: "createIdentity",
        args: [signerAddress],
      });

      setSuccess(
        `Transaction sent! Hash: ${hash.substring(0, 10)}... Waiting for confirmation...`,
      );
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Get the identity address from the IdentityCreated event
      let newIdentityAddress: string | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: IdentityCloneFactoryAbi,
            eventName: "IdentityCreated",
            data: log.data,
            topics: log.topics,
          });
          newIdentityAddress = decoded.args.identity;
          break;
        } catch {
          continue;
        }
      }

      if (!newIdentityAddress) {
        throw new Error("Identity creation event not found");
      }

      setIdentityAddress(newIdentityAddress); // Set identity address immediately
      setSuccess(`Identity created at ${newIdentityAddress}. Registering...`);

      // Step 2: Register the identity in IdentityRegistry
      const registryAddress = IDENTITY_REGISTRY_ADDRESS as Address;

      // Check if already registered before attempting to register
      const isAlreadyRegistered = await publicClient.readContract({
        address: registryAddress,
        abi: IdentityRegistryAbi,
        functionName: "isRegistered",
        args: [signerAddress],
      });
      if (isAlreadyRegistered) {
        const existingIdentity = await publicClient.readContract({
          address: registryAddress,
          abi: IdentityRegistryAbi,
          functionName: "getIdentity",
          args: [signerAddress],
        });
        setIdentityAddress(existingIdentity);
        setIsRegistered(true);
        setSuccess(`Identity already registered at ${existingIdentity}!`);
        return;
      }

      setSuccess("Waiting for registration signature... Check your wallet!");

      const registerHash = await walletClient.writeContract({
        address: registryAddress,
        abi: IdentityRegistryAbi,
        functionName: "registerIdentity",
        args: [signerAddress, newIdentityAddress as Address],
      });

      setSuccess(
        `Registration sent! Hash: ${registerHash.substring(0, 10)}... Waiting for confirmation...`,
      );
      await publicClient.waitForTransactionReceipt({ hash: registerHash });

      // Update state
      setIsRegistered(true);
      setSuccess(`Identity successfully created and registered at ${newIdentityAddress}!`);
    } catch (err) {
      const info = normalizeWalletError(err);
      let errorMessage = info.reason || info.message || "Unknown error";

      if (info.code === 4001 || /user rejected|user denied|action_rejected/i.test(info.message)) {
        errorMessage = "Transaction was rejected by user";
      }

      setError(`Failed to create identity: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  const registerExistingIdentity = async () => {
    if (!account || !walletClient || !publicClient || !identityAddress) {
      setError("Missing required data");
      return;
    }

    setIsCreating(true);
    setError("");
    setSuccess("");

    try {
      assertCanonicalChain(chainId);

      const registryAddress = IDENTITY_REGISTRY_ADDRESS as Address;

      setSuccess("Waiting for registration signature... Check your wallet!");

      const registerHash = await walletClient.writeContract({
        address: registryAddress,
        abi: IdentityRegistryAbi,
        functionName: "registerIdentity",
        args: [account as Address, identityAddress as Address],
      });

      setSuccess(
        `Registration sent! Hash: ${registerHash.substring(0, 10)}... Waiting for confirmation...`,
      );
      await publicClient.waitForTransactionReceipt({ hash: registerHash });

      // Update state
      setIsRegistered(true);
      setSuccess(`Identity successfully registered at ${identityAddress}!`);

      // Recheck registration status to confirm
      await checkRegistrationStatus(account);
    } catch (err) {
      const info = normalizeWalletError(err);
      let errorMessage = info.reason || info.message || "Unknown error";

      if (info.code === 4001 || /user rejected|user denied|action_rejected/i.test(info.message)) {
        errorMessage = "Transaction was rejected by user";
      }

      setError(`Failed to register identity: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClaimRequestSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleClaimAdded = () => {
    loadIdentityClaims();
  };

  const loadIdentityClaims = useCallback(async () => {
    if (!identityAddress || identityAddress === ZERO_ADDRESS) {
      setIdentityClaims([]);
      return;
    }

    try {
      const client = publicClient ?? getPublicClient();
      const registryAddress = TRUSTED_ISSUERS_REGISTRY_ADDRESS as Address;

      // First, try to get all topics from TrustedIssuersRegistry
      let topicsToCheck: number[] = [];
      try {
        const issuerAddresses = await client.readContract({
          address: registryAddress,
          abi: TRUSTED_ISSUERS_REGISTRY_ABI,
          functionName: "getTrustedIssuers",
        });
        const allTopics = new Set<number>();

        for (const issuerAddress of issuerAddresses) {
          try {
            const issuerTopics = await client.readContract({
              address: registryAddress,
              abi: TRUSTED_ISSUERS_REGISTRY_ABI,
              functionName: "getIssuerClaimTopics",
              args: [issuerAddress],
            });
            issuerTopics.forEach((topic) => {
              allTopics.add(Number(topic));
            });
          } catch {
            // Un issuer sin topics legibles no bloquea el resto
          }
        }

        topicsToCheck = Array.from(allTopics);
      } catch {
        // Fallback: check a wider range of common topics
        topicsToCheck = Array.from({ length: 20 }, (_, i) => i + 1);
      }

      // If no topics found, use default range
      if (topicsToCheck.length === 0) {
        topicsToCheck = Array.from({ length: 20 }, (_, i) => i + 1);
      }

      // Use the getIdentityClaims function which is more robust
      const claimsData = await getIdentityClaims(identityAddress, topicsToCheck);

      // Convert to the format expected by the component
      const claims = claimsData.map((claim) => ({
        topic: claim.topic,
        issuer: claim.issuer,
      }));

      setIdentityClaims(claims);
    } catch {
      setIdentityClaims([]);
    }
  }, [identityAddress, publicClient]);

  // Load claims when identity address changes
  useEffect(() => {
    if (identityAddress && identityAddress !== ZERO_ADDRESS) {
      loadIdentityClaims();
    }
  }, [identityAddress, loadIdentityClaims]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-sans dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">

        <div className="mb-8 flex flex-col gap-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              RWA Identity Management
            </h1>

            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Connect your crypto wallet to create and manage your on-chain identity.
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              Identity Registry: {IDENTITY_REGISTRY_ADDRESS}
            </p>
          </div>

          {/* Connection Status and Info Cards */}
          {account && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Account Status Card */}
              <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
                <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                  Account Status
                </h3>

                <div className="space-y-3">
                  <div>
                    <p className="text-base font-medium text-gray-500 dark:text-gray-400">Connected Address:</p>
                    <p className="mt-1 break-all font-mono text-base text-gray-900 dark:text-white">
                      {account}
                    </p>
                  </div>

                  {isCheckingRegistration ? (
                    <p className="text-base text-gray-600 dark:text-gray-400">
                      Checking registration status...
                    </p>
                  ) : (
                    <>
                      <div>
                        <p className="text-base font-medium text-gray-500 dark:text-gray-400">
                          Registry Status:{' '}
                          <span className={isRegistered ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}>
                            {isRegistered ? "✓ Registered" : "⚠ Not Registered"}
                          </span>
                        </p>
                      </div>

                      {identityAddress && identityAddress !== ZERO_ADDRESS && (
                        <div>
                          <p className="text-base font-medium text-gray-500 dark:text-gray-400">Identity Contract:</p>
                          <p className="mt-1 break-all font-mono text-sm text-gray-900 dark:text-white">
                            {identityAddress}
                          </p>
                        </div>
                      )}

                      {/* Claims in Identity */}
                      {identityClaims.length > 0 && (
                        <div>
                          <p className="text-base font-medium text-gray-500 dark:text-gray-400">
                            Claims in Identity:
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {identityClaims.map((claim, idx) => {
                              const topicNum = Number(claim.topic);
                              const claimName = CLAIM_TOPIC_NAMES[topicNum] || `Claim ${topicNum}`;
                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                  title={`Issuer: ${claim.issuer}\nTopic: ${topicNum}`}
                                >
                                  ✓ {claimName}
                                </span>
                              );
                            })}
                          </div>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {identityClaims.length} claim{identityClaims.length !== 1 ? 's' : ''} loaded in your identity contract
                          </p>
                        </div>
                      )}
                      {identityAddress && identityAddress !== ZERO_ADDRESS && identityClaims.length === 0 && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No claims found in your identity contract. Request claims from trusted issuers below.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Information Card */}
              <div className="rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-lg dark:from-gray-800 dark:to-gray-700 dark:border dark:border-gray-600">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  📚 How It Works
                </h3>

                <div className="space-y-4">
                  <div className="rounded-lg bg-white/60 p-4 dark:bg-gray-800/60">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                      🏛️ Identity Registry
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      El contrato <strong>Identity Registry</strong> registra todos los contratos identidad. Es el punto central que mapea cada dirección de wallet con su contrato de identidad correspondiente.
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/60 p-4 dark:bg-gray-800/60">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                      📋 Identity Contract
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      El <strong>Identity Contract</strong> contiene todas las claims de un usuario. Cada usuario tiene su propio contrato de identidad donde se almacenan sus credenciales verificadas.
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/60 p-4 dark:bg-gray-800/60">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                      ✍️ Claims
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Las <strong>claims</strong> son documentos firmados criptográficamente por un Issuer. Representan credenciales verificadas como KYC, acreditación de inversor, o cumplimiento jurisdiccional.
                    </p>
                  </div>

                  <div className="rounded-lg bg-white/60 p-4 dark:bg-gray-800/60">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                      🏢 Trusted Issuers Registry
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Existe un <strong>Registro de Issuers</strong> donde cada issuer gestiona varias claims. Solo los issuers registrados y confiables pueden emitir claims válidas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-100 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="rounded-lg border border-green-300 bg-green-100 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="text-sm text-green-800 dark:text-green-400">{success}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row">
            {!account ? (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            ) : (
              <>
                {!isRegistered && !isCheckingRegistration && (
                  <>
                    {!identityAddress || identityAddress === ZERO_ADDRESS ? (
                      <button
                        onClick={createIdentity}
                        disabled={isCreating}
                        className="flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isCreating ? "Creating..." : "Create Identity"}
                      </button>
                    ) : (
                      <button
                        onClick={registerExistingIdentity}
                        disabled={isCreating}
                        className="flex h-12 items-center justify-center gap-2 rounded-lg bg-orange-600 px-8 text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isCreating ? "Registering..." : "Register Identity"}
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Claim Management Section - Only show when registered */}
        {account && isRegistered && (
          <div className="mt-8 space-y-6">
            <div className="rounded-lg border-2 border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-300">
                🎉 Identity Registered!
              </h3>
              <p className="mt-1 text-sm text-green-800 dark:text-green-400">
                You can now request claims from trusted issuers.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Claim Request Form */}
              <div>
                <ClaimRequestForm
                  userAddress={account}
                  onSuccess={handleClaimRequestSuccess}
                />
              </div>

              {/* Claim Requests List */}
              <div>
                <ClaimRequestsList
                  userAddress={account}
                  refreshTrigger={refreshTrigger}
                  identityAddress={identityAddress}
                  onClaimAdded={handleClaimAdded}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
