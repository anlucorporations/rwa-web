/** POST /api/claims/{id}/issue — emisión firmada del claim (CU-10). */
import { checkWriteRateLimit } from "@/lib/rate-limit";
import { toErrorResponse, ValidationError, ForbiddenError, query } from "@rwa/shared";
import { recoverClaimIssuer } from "@rwa/shared/claims";
import type { Hex } from "viem";

import { getClaim, issueClaim, typedDataFor } from "@/lib/claims";
import { assertProgramScope, requireAnyRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  signature?: string;
  txHash?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const { assignments, session } = await requireAnyRole(request, ["issuer", "admin"]);
    checkWriteRateLimit(session.address);
    const body = (await request.json()) as Body;
    if (!body.signature) throw new ValidationError("Falta la firma del emisor", "signature");

    const claim = await getClaim(id);
    if (!claim) {
      return new Response(JSON.stringify({ success: false, error: { code: "not_found", message: "Solicitud no encontrada" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    assertProgramScope(assignments, claim.issuer_program_id);
    if (claim.status !== "documents_verified") {
      return new Response(
        JSON.stringify({ success: false, error: { code: "conflict", message: "La solicitud debe estar verificada por el Operador" } }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    const typedData = typedDataFor(claim);
    const issuer = await recoverClaimIssuer(typedData, body.signature as Hex);

    const issuerRow = await query<{ id: string }>(
      `SELECT id FROM rwa.issuers
        WHERE lower(address) = lower($1) AND issuer_program_id = $2`,
      [issuer, claim.issuer_program_id],
    );
    if (!issuerRow.rows[0]) throw new ForbiddenError("El firmante no es un emisor autorizado del programa");

    const txHash = body.txHash && /^0x[0-9a-fA-F]{64}$/.test(body.txHash) ? body.txHash : null;
    const issued = await issueClaim({
      claimId: id,
      issuerWallet: issuer,
      issuerId: issuerRow.rows[0].id,
      issuerSignature: body.signature,
      txHash,
    });
    return new Response(JSON.stringify({ success: true, data: issued }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "CONFLICT") {
      return new Response(
        JSON.stringify({ success: false, error: { code: "conflict", message: (error as Error).message } }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }
    const { status, body } = toErrorResponse(error, request);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }
}
