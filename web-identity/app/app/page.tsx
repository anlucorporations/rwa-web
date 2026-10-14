"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/contexts/WalletContext";
import {
  getIdentityRegistryContract,
  getIdentityCloneFactoryContract,
  IDENTITY_REGISTRY_ADDRESS,
} from "@/lib/contracts";
import ClaimRequestForm from "@/components/ClaimRequestForm";
import ClaimRequestsList from "@/components/ClaimRequestsList";
import { CLAIM_TOPIC_NAMES } from "@/lib/identity-claims";

export default function Home() {
  const {
    provider,
    account,
    walletName,
    isConnecting,
    connectWallet
  } = useWallet();

  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [identityAddress, setIdentityAddress] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [identityClaims, setIdentityClaims] = useState<{ topic: bigint; issuer: string }[]>([]);

  const checkRegistrationStatus = useCallback(async (address: string) => {
    if (!provider) return;

    setIsCheckingRegistration(true);
    setError("");
    try {
      console.log("🔍 Verificando registro para:", address);

      // First verify we're on the right network
      const network = await provider.getNetwork();
      console.log("   Network chainId:", network.chainId);

      if (network.chainId !== 81234n) {
        throw new Error(`Wrong network! Please switch to Besu (chainId: 81234). Current: ${network.chainId}`);
      }

      const registryWithProvider = getIdentityRegistryContract(provider);
      console.log("   Registry contract:", await registryWithProvider.getAddress());

      const registered = await registryWithProvider.isRegistered(address);
      console.log("   Resultado:", registered ? "Registrado" : "No registrado");

      setIsRegistered(registered);

      if (registered) {
        const identity = await registryWithProvider.getIdentity(address);
        console.log("   Dirección de identidad:", identity);
        setIdentityAddress(identity);
      } else {
        setIdentityAddress("");
      }
    } catch (err) {
      console.error("Error checking registration:", err);
      const error = err as { code?: string; message?: string; reason?: string; data?: string };

      // If it's a contract error, assume not registered
      if (error.code === 'CALL_EXCEPTION') {
        console.log("⚠️ Error en llamada al contrato");
        console.log("   Error data:", error.data);
        console.log("   Error reason:", error.reason);
        console.log("   Asumiendo no registrado");
        setIsRegistered(false);
        setIdentityAddress("");
        setError("Cannot connect to contracts. Make sure you're on Besu network (chainId: 81234)");
      } else {
        setError(`Error checking registration: ${error.message || "Unknown error"}`);
      }
    } finally {
      setIsCheckingRegistration(false);
    }
  }, [provider]);

  // Check registration status when account changes
  useEffect(() => {
    if (account && provider) {
      checkRegistrationStatus(account);
    } else {
      // Clear state when disconnected
      setIsRegistered(false);
      setIdentityAddress("");
      setIdentityClaims([]);
    }
  }, [account, provider, checkRegistrationStatus]);

  const createIdentity = async () => {
    if (!account || !provider) {
      setError("Please connect your wallet first");
      return;
    }

    setIsCreating(true);
    setError("");
    setSuccess("");

    try {
      // Get the signer from the context provider
      setSuccess("Getting signer...");
      console.log("📝 Obteniendo signer para la cuenta:", account);

      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      console.log("✅ Signer obtenido!");
      console.log("   Connected account:", account);
      console.log("   Signer address:", signerAddress);

      // Verify the signer matches the connected account
      if (signerAddress.toLowerCase() !== account.toLowerCase()) {
        throw new Error("Signer address doesn't match connected account. Please reconnect your wallet.");
      }

      // Step 1: Create identity using IdentityCloneFactory
      setSuccess("Creating identity contract...");

      const factory = getIdentityCloneFactoryContract(signer);

      console.log("📝 Preparando transacción para crear identidad...");
      console.log("   Factory address:", factory.target);
      console.log("   Owner address:", signerAddress);

      // Use the signer's address instead of the account state
      setSuccess("Waiting for transaction signature... Check your wallet!");
      console.log("⏳ Esperando firma del usuario en la wallet...");

      const tx = await factory.createIdentity(signerAddress);

      console.log("✅ Transacción firmada y enviada!");
      console.log("   Transaction hash:", tx.hash);

      setSuccess(`Transaction sent! Hash: ${tx.hash.substring(0, 10)}... Waiting for confirmation...`);
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error("Transaction receipt not received");
      }

      // Get the identity address from the IdentityCreated event
      const event = receipt.logs
        .map((log: { topics: string[]; data: string }) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsedLog: { name: string } | null) => parsedLog?.name === "IdentityCreated");

      if (!event) {
        throw new Error("Identity creation event not found");
      }

      const newIdentityAddress = event.args.identity;
      console.log("✅ Identidad creada:", newIdentityAddress);
      setIdentityAddress(newIdentityAddress); // Set identity address immediately
      setSuccess(`Identity created at ${newIdentityAddress}. Registering...`);

      // Step 2: Register the identity in IdentityRegistry
      console.log("📝 Preparando transacción para registrar identidad...");
      const registry = getIdentityRegistryContract(signer);

      // Check if already registered before attempting to register
      const isAlreadyRegistered = await registry.isRegistered(signerAddress);
      if (isAlreadyRegistered) {
        console.log("⚠️ Address already registered, skipping registration");
        const existingIdentity = await registry.getIdentity(signerAddress);
        setIdentityAddress(existingIdentity);
        setIsRegistered(true);
        setSuccess(`Identity already registered at ${existingIdentity}!`);
        return;
      }

      setSuccess("Waiting for registration signature... Check your wallet!");
      console.log("⏳ Esperando segunda firma del usuario en la wallet...");

      const registerTx = await registry.registerIdentity(signerAddress, newIdentityAddress);

      console.log("✅ Registro firmado y enviado!");
      console.log("   Transaction hash:", registerTx.hash);

      setSuccess(`Registration sent! Hash: ${registerTx.hash.substring(0, 10)}... Waiting for confirmation...`);
      const registerReceipt = await registerTx.wait();

      if (!registerReceipt) {
        throw new Error("Registration transaction receipt not received");
      }

      // Update state
      setIsRegistered(true);
      setSuccess(`Identity successfully created and registered at ${newIdentityAddress}!`);
    } catch (err) {
      console.error("Error creating identity:", err);
      let errorMessage = "Unknown error";
      const error = err as {
        code?: string;
        message?: string;
        reason?: string;
        data?: string;
        shortMessage?: string;
      };

      if (error.code === 'ACTION_REJECTED') {
        errorMessage = "Transaction was rejected by user";
      } else       if (error.data) {
        // Check for custom errors
        const errorData = error.data;
        if (errorData.includes('Wallet already registered')) {
          errorMessage = "This wallet address is already registered. Please check your existing identity.";
        } else if (error.reason) {
          errorMessage = error.reason;
        } else if (error.shortMessage) {
          errorMessage = error.shortMessage;
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else if (error.reason) {
        errorMessage = error.reason;
      } else if (error.shortMessage) {
        errorMessage = error.shortMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(`Failed to create identity: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  const registerExistingIdentity = async () => {
    if (!account || !provider || !identityAddress) {
      setError("Missing required data");
      return;
    }

    setIsCreating(true);
    setError("");
    setSuccess("");

    try {
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      console.log("📝 Registrando identidad existente:", identityAddress);
      const registry = getIdentityRegistryContract(signer);

      setSuccess("Waiting for registration signature... Check your wallet!");
      console.log("⏳ Esperando firma del usuario en la wallet...");

      const registerTx = await registry.registerIdentity(signerAddress, identityAddress);

      console.log("✅ Registro firmado y enviado!");
      console.log("   Transaction hash:", registerTx.hash);

      setSuccess(`Registration sent! Hash: ${registerTx.hash.substring(0, 10)}... Waiting for confirmation...`);
      const registerReceipt = await registerTx.wait();

      if (!registerReceipt) {
        throw new Error("Registration transaction receipt not received");
      }

      // Update state
      setIsRegistered(true);
      setSuccess(`Identity successfully registered at ${identityAddress}!`);

      // Recheck registration status to confirm
      await checkRegistrationStatus(account);
    } catch (err) {
      console.error("Error registering identity:", err);
      let errorMessage = "Unknown error";
      const error = err as { code?: string; message?: string; reason?: string };

      if (error.code === 'ACTION_REJECTED') {
        errorMessage = "Transaction was rejected by user";
      } else if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        errorMessage = error.message;
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
    if (!identityAddress || identityAddress === '0x0000000000000000000000000000000000000000' || !provider) {
      setIdentityClaims([]);
      return;
    }

    try {
      console.log('📋 Loading claims from identity contract:', identityAddress);

      // Dynamic import of ethers
      const { ethers } = await import('ethers');
      const { getIdentityClaims } = await import('@/lib/identity-claims');

      // First, try to get all topics from TrustedIssuersRegistry
      let topicsToCheck: number[] = [];
      try {
        const { TRUSTED_ISSUERS_REGISTRY_ADDRESS, TRUSTED_ISSUERS_REGISTRY_ABI } = await import('@/contracts/TrustedIssuersRegistry');
        const registryContract = new ethers.Contract(
          TRUSTED_ISSUERS_REGISTRY_ADDRESS,
          TRUSTED_ISSUERS_REGISTRY_ABI,
          provider
        );

        const issuerAddresses = await registryContract.getTrustedIssuers();
        const allTopics = new Set<number>();

        for (const issuerAddress of issuerAddresses) {
          try {
            const issuerTopics = await registryContract.getIssuerClaimTopics(issuerAddress);
            issuerTopics.forEach((topic: bigint) => {
              allTopics.add(Number(topic));
            });
          } catch (err) {
            console.warn(`Error getting topics for issuer ${issuerAddress}:`, err);
          }
        }

        topicsToCheck = Array.from(allTopics);
        console.log('📋 Found topics from registry:', topicsToCheck);
      } catch (err) {
        console.warn('Could not load topics from registry, using default range:', err);
        // Fallback: check a wider range of common topics
        topicsToCheck = Array.from({ length: 20 }, (_, i) => i + 1);
      }

      // If no topics found, use default range
      if (topicsToCheck.length === 0) {
        topicsToCheck = Array.from({ length: 20 }, (_, i) => i + 1);
      }

      // Use the getIdentityClaims function which is more robust
      const claimsData = await getIdentityClaims(identityAddress, topicsToCheck, provider);

      // Convert to the format expected by the component
      const claims = claimsData.map(claim => ({
        topic: claim.topic,
        issuer: claim.issuer
      }));

      console.log('✅ Claims loaded:', claims);
      setIdentityClaims(claims);
    } catch (err) {
      console.error('Error loading claims:', err);
      setIdentityClaims([]);
    }
  }, [identityAddress, provider]);

  // Load claims when identity address changes
  useEffect(() => {
    if (identityAddress && identityAddress !== '0x0000000000000000000000000000000000000000' && provider) {
      loadIdentityClaims();
    }
  }, [identityAddress, provider, loadIdentityClaims]);

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

                      {identityAddress && identityAddress !== '0x0000000000000000000000000000000000000000' && (
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
                      {identityAddress && identityAddress !== '0x0000000000000000000000000000000000000000' && identityClaims.length === 0 && (
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
                    {!identityAddress || identityAddress === '0x0000000000000000000000000000000000000000' ? (
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
