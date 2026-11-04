/** GET /api/documents/{id} — descarga descifrada para titular/Operador/Admin (CU-04/09). */
import { decryptDocument, requireSession, toErrorResponse } from "@rwa/shared";

import { getClaim, getDocument } from "@/lib/claims";
import { roleAssignments } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const session = await requireSession(request);
    const document = await getDocument(id);
    if (!document) {
      return new Response(JSON.stringify({ success: false, error: { code: "not_found", message: "Documento no encontrado" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const claim = await getClaim(document.claim_request_id);
    if (!claim) throw new Error("Solicitud asociada no encontrada");

    const isOwner = claim.requester_wallet.toLowerCase() === session.address.toLowerCase();
    const staff = await roleAssignments(session.address, ["operator", "admin"]);
    if (!isOwner && staff.length === 0) {
      return new Response(JSON.stringify({ success: false, error: { code: "forbidden", message: "No autorizado" } }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const nonce = document.encryption_meta?.nonce ? Buffer.from(document.encryption_meta.nonce, "hex") : null;
    const plain = decryptDocument({
      content: document.encrypted_data,
      encryptionAlgo: "AES-256-GCM",
      encryptionNonce: nonce,
    });
    return new Response(new Uint8Array(plain), {
      status: 200,
      headers: {
        "Content-Type": document.mime_type,
        "Content-Disposition": `attachment; filename="${document.label.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }
}
