/** GET/POST /api/admin/issuer-programs — CRUD de ISSUER (CU-08, solo Admin). */
import { createProgram, listPrograms } from "@/lib/admin";
import { adminError } from "@/lib/api-errors";
import { requireAdminFresh } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdminFresh(request);
    const includeInactive = new URL(request.url).searchParams.get("all") === "1";
    const programs = await listPrograms(includeInactive);
    return json({ success: true, data: programs });
  } catch (error) {
    return adminError(request, error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireAdminFresh(request);
    const body = (await request.json()) as Parameters<typeof createProgram>[0];
    const program = await createProgram(body, session.address);
    return json({ success: true, data: program }, 201);
  } catch (error) {
    return adminError(request, error);
  }
}
