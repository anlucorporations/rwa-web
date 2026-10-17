/**
 * Esquemas de validación de entrada (RT-W-03, RF-W-14).
 *
 * Fuente única para todas las rutas de API de las 3 apps. `parseBody` valida y
 * lanza `ValidationError` (400) con el campo culpable; las rutas dejan de validar
 * a mano y de aceptar campos desconocidos.
 */

import { z } from 'zod';

import { ValidationError } from '../errors';

/** Dirección Ethereum (0x + 40 hex). Se normaliza a minúsculas en la capa de datos. */
export const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, 'dirección Ethereum inválida (0x + 40 hex)');

export const uuidSchema = z.string().uuid('identificador uuid inválido');

/** Firma EIP-712/EIP-191 de 65 bytes. */
export const signatureSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{130}$/, 'firma inválida: se esperan 65 bytes');

/** Entero de 256 bits como string o número seguro. */
const uintSchema = z.union([
  z.string().regex(/^\d+$/, 'entero no negativo esperado'),
  z.number().int().nonnegative(),
]);

const hexSchema = z.string().regex(/^0x[0-9a-fA-F]*$/, 'hex esperado (0x…)');

// ---------------------------------------------------------------------------
// Autenticación SIWE
// ---------------------------------------------------------------------------

export const siweNonceSchema = z.object({
  address: addressSchema,
});

export const siweVerifySchema = z.object({
  message: z.string().min(1).max(5000),
  signature: z.string().min(1).max(1000),
});

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export const createClaimRequestSchema = z.object({
  requesterAddress: addressSchema,
  issuerAddress: addressSchema,
  claimTopic: z.union([z.string().min(1), z.number().int().nonnegative()]),
  message: z.string().max(2000).nullish(),
  signedMessage: z.string().min(1).max(5000),
  signature: z.string().min(1).max(1000),
});

export const claimPayloadSchema = z.object({
  chainId: z.number().int().positive(),
  identityAddress: addressSchema,
  walletOwner: addressSchema,
  topic: uintSchema,
  scheme: z.number().int(),
  data: hexSchema,
  uri: z.string().min(1).max(2048),
  expiresAt: uintSchema,
  nonce: uintSchema,
});

export const updateRequestSchema = z.object({
  requestId: uuidSchema,
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().max(2000).nullish(),
  claim: claimPayloadSchema.optional(),
  claimSignature: signatureSchema.optional(),
  issuerSignedMessage: z.string().min(1).max(10000).optional(),
  issuerSignature: z.string().min(1).max(1000).optional(),
});

export const issuersBatchSchema = z.object({
  addresses: z.array(addressSchema).min(1).max(200),
});

export const issuerNameSchema = z.object({
  address: addressSchema,
  name: z.string().trim().min(1, 'el nombre no puede estar vacío').max(120),
});

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export const createTokenSchema = z.object({
  name: z.string().trim().min(1).max(120),
  symbol: z.string().regex(/^[A-Z0-9]{1,11}$/, 'symbol inválido: ^[A-Z0-9]{1,11}$'),
  decimals: z.number().int().min(0).max(18),
  adminAddress: addressSchema,
  tokenAddress: addressSchema,
  identityRegistry: addressSchema,
  trustedIssuersRegistry: addressSchema,
  claimTopicsRegistry: addressSchema,
  requiredClaims: z.array(z.number().int().nonnegative()).min(1, 'exige al menos un claim topic'),
  description: z.string().max(2000).nullish(),
  transactionHash: z.string().max(200).nullish(),
  blockNumber: z.number().int().nonnegative().nullish(),
  complianceAddress: addressSchema.nullish(),
  complianceModules: z.array(addressSchema).optional(),
});

export const setClaimsSchema = z.object({
  claims: z.array(z.number().int().nonnegative()).min(1),
});

export const setComplianceSchema = z.object({
  complianceAddress: addressSchema,
});

export const setModulesSchema = z.object({
  modules: z.array(addressSchema),
});

export const setPriceSchema = z.object({
  price: z.union([
    z.string().regex(/^\d+(\.\d+)?$/, 'precio decimal no negativo esperado'),
    z.number().nonnegative(),
  ]),
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Valida `raw` contra `schema`; lanza `ValidationError` (→ 400) con el campo culpable. */
export function parseBody<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ValidationError(issue?.message ?? 'Cuerpo de la petición inválido', issue?.path.join('.'));
  }
  return result.data;
}

export type SiweNonceInput = z.infer<typeof siweNonceSchema>;
export type SiweVerifyInput = z.infer<typeof siweVerifySchema>;
export type CreateClaimRequestBody = z.infer<typeof createClaimRequestSchema>;
export type UpdateRequestBody = z.infer<typeof updateRequestSchema>;
export type CreateTokenBody = z.infer<typeof createTokenSchema>;
