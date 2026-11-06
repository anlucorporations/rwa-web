/** PATCH /api/admin/issuer-programs/{id} — activar/desactivar un ISSUER (solo Admin). */
import { setProgramActive } from "@/lib/admin";
import { adminError } from "@/lib/api-errors";
import { requireAdminFresh } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const session = await requireAdminFresh(request);
    const { id } = await params;
    const body = (await request.json()) as { active?: boolean };
    if (typeof body.active !== "boolean") {
      return new Response(
        JSON.stringify({ success: false, error: { code: "invalid_body", message: "Falta `active` (boolean)" } }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    const ok = await setProgramActive(id, body.active, session.address);
    return new Response(JSON.stringify({ success: ok, data: { active: body.active } }), {
      status: ok ? 200 : 404,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return adminError(request, error);
  }
}
