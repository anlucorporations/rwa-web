/** GET /api/system — snapshot del Sistema (CU-17; Admin y Auditor). */
import { systemSnapshot } from "@/lib/admin";
import { adminError } from "@/lib/api-errors";
import { requireAnyRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAnyRole(request, ["admin", "auditor"]);
    const snapshot = await systemSnapshot();
    return new Response(JSON.stringify({ success: true, data: snapshot }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return adminError(request, error);
  }
}
