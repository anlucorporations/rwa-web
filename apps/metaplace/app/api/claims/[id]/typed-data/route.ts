/** GET /api/claims/{id}/typed-data — EIP-712 que el emisor debe firmar (CU-10). */
import { toErrorResponse } from "@rwa/shared";
import { getAddress } from "viem";

import { getClaim, typedDataFor } from "@/lib/claims";
import { requireAnyRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    await requireAnyRole(request, ["issuer", "admin"]);
    const claim = await getClaim(id);
    if (!claim) {
      return new Response(JSON.stringify({ success: false, error: { code: "not_found", message: "Solicitud no encontrada" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const data = typedDataFor(claim);
    // Serializa los enteros de 256 bits como strings (JSON no admite bigint).
    const serialized = {
      domain: data.domain,
      types: data.types,
      primaryType: data.primaryType,
      message: {
        ...data.message,
        walletOwner: getAddress(data.message.walletOwner),
        topic: data.message.topic.toString(),
        scheme: data.message.scheme.toString(),
        expiresAt: data.message.expiresAt.toString(),
        nonce: data.message.nonce.toString(),
      },
    };
    return new Response(JSON.stringify({ success: true, data: serialized }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }
}
