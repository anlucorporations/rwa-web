/**
 * GET /api/claims — mis solicitudes de certificado.
 * POST /api/claims — crear solicitud con documento cifrado (CU-04).
 */
import { createHash } from "node:crypto";
import { recoverMessageAddress } from "viem";
import {
  assertAllowedUpload,
  encryptDocument,
  ForbiddenError,
  NotFoundError,
  query,
  requireSession,
  toErrorResponse,
  ValidationError,
} from "@rwa/shared";
import type { Hex } from "viem";

import { createClaim, insertDocument, listClaimsFor } from "@/lib/claims";
import { findIdentity } from "@/lib/identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await requireSession(request);
    const claims = await listClaimsFor(session.address);
    return json({ success: true, data: claims });
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return json(body, status);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await requireSession(request);
    const identity = await findIdentity(session.address);
    if (!identity) throw new NotFoundError("Identidad", session.address);

    const form = await request.formData();
    const programSlug = String(form.get("programSlug") ?? "");
    const credentialCode = String(form.get("credentialCode") ?? "");
    const requesterSignature = String(form.get("requesterSignature") ?? "");
    const file = form.get("file");
    if (!programSlug || !credentialCode) throw new ValidationError("Faltan dato del ISSUER o del claim", "programSlug");
    if (!(file instanceof File)) throw new ValidationError("Falta el documento", "file");
    if (file.size <= 0 || file.size > MAX_BYTES) throw new ValidationError("Documento vacío o demasiado grande", "file");

    // Firma del solicitante (EIP-191): vincula la solicitud a su wallet.
    const message = `Barlo: solicito el certificado ${credentialCode} para ${identity.id}`;
    const signer = await recoverMessageAddress({ message, signature: requesterSignature as Hex });
    if (signer.toLowerCase() !== session.address.toLowerCase()) {
      throw new ForbiddenError("La firma de la solicitud no corresponde a la wallet de la sesión");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = assertAllowedUpload(buffer, file.type); // valida magic bytes, no `file.type`
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const encrypted = encryptDocument(buffer);

    const topicRow = await query<{ on_chain_topic: number | null }>(
      `SELECT ct.on_chain_topic FROM rwa.issuer_programs ip
         JOIN rwa.issuer_program_credentials ipc ON ipc.issuer_program_id = ip.id
         JOIN rwa.credential_types ct ON ct.id = ipc.credential_type_id
        WHERE ip.slug = $1 AND ct.code = $2 AND ip.active`,
      [programSlug, credentialCode],
    );
    if (!topicRow.rows[0]) throw new NotFoundError("ISSUER o credencial", `${programSlug}/${credentialCode}`);

    const uri = `barlo://claim/${identity.id}/${credentialCode}`;
    const claim = await createClaim({
      identityId: identity.id,
      requesterWallet: session.address,
      programSlug,
      credentialCode,
      requesterSignature,
      metadataClaim: {
        chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337"),
        identityAddress: process.env.CLAIM_VERIFYING_CONTRACT ?? session.address,
        topic: topicRow.rows[0].on_chain_topic ?? 0,
        scheme: 1,
        data: "0x",
        uri,
        expiresAt: "0",
        nonce: String(Date.now()),
      },
    });

    await insertDocument({
      claimRequestId: claim.id,
      label: file.name || "documento",
      mimeType,
      sizeBytes: buffer.length,
      sha256Hex: sha256,
      encrypted: encrypted.content,
      nonceHex: encrypted.nonce.toString("hex"),
      retentionDeleteAt: null,
    });

    return json({ success: true, data: claim }, 201);
  } catch (error) {
    const { status, body } = toErrorResponse(error, request);
    return json(body, status);
  }
}
