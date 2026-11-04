/** GET/POST /api/admin/roles — concesión y listado de roles (CU-15, solo Admin). */
import { grantRole, listRoles } from "@/lib/admin";
import { adminError } from "@/lib/api-errors";
import { requireAnyRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAnyRole(request, ["admin"]);
    return json({ success: true, data: await listRoles() });
  } catch (error) {
    return adminError(request, error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { session } = await requireAnyRole(request, ["admin"]);
    const body = (await request.json()) as Parameters<typeof grantRole>[0];
    const created = await grantRole(body, session.address);
    return json({ success: true, data: created }, 201);
  } catch (error) {
    return adminError(request, error);
  }
}
