/** POST /api/auth/nonce — manejador compartido de @rwa/shared (SIWE, RF-V3-01). */
import { handleNonce } from "@rwa/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = handleNonce;
