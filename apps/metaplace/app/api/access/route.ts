/** GET /api/access — gate de acceso al Metaplace (RF-V3-02: claim SOCIO vigente). */
import { query, requireSession, toErrorResponse } from "@rwa/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await requireSession(request);
    const { rows } = await query<{ credential_code: string }>(
      `SELECT ct.code AS credential_code
         FROM rwa.claim_requests cr
         JOIN rwa.identities i ON i.id = cr.identity_id
         JOIN rwa.credential_types ct ON ct.id = cr.credential_type_id
        WHERE lower(i.wallet_address) = lower($1) AND cr.status = 'approved'`,
      [session.address],
    );
    const codes = new Set(rows.map((r) => r.credential_code));
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          hasSocio: codes.has("SOCIO"),
          hasKyc: codes.has("KYC"),
          approvedCredentials: [...codes].sort(),
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }
}
