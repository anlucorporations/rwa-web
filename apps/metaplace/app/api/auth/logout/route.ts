/** POST /api/auth/logout — manejador compartido de @rwa/shared (SIWE, RF-V3-01). */
import { handleLogout } from "@rwa/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = handleLogout;
