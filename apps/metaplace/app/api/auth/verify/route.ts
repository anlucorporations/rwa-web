/** POST /api/auth/verify — manejador compartido de @rwa/shared (SIWE, RF-V3-01). */
import { handleVerify } from "@rwa/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = handleVerify;
