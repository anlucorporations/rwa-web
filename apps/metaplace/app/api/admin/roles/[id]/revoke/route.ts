/** POST /api/admin/roles/{id}/revoke — revocación de rol (CU-15, solo Admin). */
import { revokeRole } from "@/lib/admin";
import { adminError } from "@/lib/api-errors";
import { requireAdminFresh } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const session = await requireAdminFresh(request);
    const { id } = await params;
    const revoked = await revokeRole(id, session.address);
    return new Response(JSON.stringify({ success: revoked }), {
      status: revoked ? 200 : 404,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return adminError(request, error);
  }
}
