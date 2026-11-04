/** GET /api/issuer-programs — catálogo de ISSUER activos y sus claims (CU-04/08). */
import { query, toErrorResponse } from "@rwa/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ProgramRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  credentials: { code: string; name: string }[];
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { rows } = await query<{ id: string; slug: string; name: string; description: string | null; credentials: { code: string; name: string }[] }>(
      `SELECT ip.id, ip.slug, ip.name, ip.description,
              json_agg(json_build_object('code', ct.code, 'name', ct.name) ORDER BY ct.code) AS credentials
         FROM rwa.issuer_programs ip
         JOIN rwa.issuer_program_credentials ipc ON ipc.issuer_program_id = ip.id
         JOIN rwa.credential_types ct ON ct.id = ipc.credential_type_id
        WHERE ip.active
        GROUP BY ip.id, ip.slug, ip.name, ip.description
        ORDER BY ip.name`,
    );
    return new Response(JSON.stringify({ success: true, data: rows }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  }
}
