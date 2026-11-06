/** GET/POST /api/assets — tokenización de productos, servicios y bienes (CU-12/13/14). */
import { toErrorResponse } from "@rwa/shared";

import { recordAudit } from "@/lib/audit";
import { createAsset, listAssetsFor, type AssetInput } from "@/lib/assets";
import { requireAnyRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { session, assignments } = await requireAnyRole(request, ["issuer", "admin"]);
    if (assignments.length === 0) return json({ success: true, data: [] });
    return json({ success: true, data: await listAssetsFor(session.address) });
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return json(body, status);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { session } = await requireAnyRole(request, ["issuer", "admin"]);
    const body = (await request.json()) as AssetInput;
    const asset = await createAsset(body, session.address);
    await recordAudit({ actor: session.address, action: "asset.created", resourceType: "token", resourceId: asset.id, metadata: { kind: asset.assetKind } });
    return json({ success: true, data: asset }, 201);
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return json(body, status);
  }
}
