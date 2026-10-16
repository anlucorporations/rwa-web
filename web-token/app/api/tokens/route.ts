/**
 * API Route para la gestión de tokens.
 *
 * GET:  listado off-chain (filtro opcional por `adminAddress`).
 * POST: alta del token + topics exigidos + módulos de compliance.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getContractAddress,
  NotFoundError,
  repos,
  toErrorResponse,
  toTokenDto,
  ValidationError,
} from '@rwa/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** El esquema exige `^[A-Z0-9]{1,11}$` para `symbol` (CHECK). */
const SYMBOL_RE = /^[A-Z0-9]{1,11}$/;

export async function GET(request: NextRequest) {
  try {
    const adminAddress = request.nextUrl.searchParams.get('adminAddress') ?? undefined;

    const items = await repos.tokens.listWithRelations({ adminAddress });

    return NextResponse.json({
      success: true,
      data: items.map((item) => toTokenDto(item.token, item)),
      count: items.length,
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const name = requiredString(body.name, 'name');
    const symbol = requiredString(body.symbol, 'symbol');
    if (!SYMBOL_RE.test(symbol)) {
      throw new ValidationError('"symbol" debe cumplir ^[A-Z0-9]{1,11}$', 'symbol');
    }

    const decimals = requiredDecimals(body.decimals);
    const adminAddress = requiredString(body.adminAddress, 'adminAddress');
    const tokenAddress = requiredString(body.tokenAddress, 'tokenAddress');

    // Fallback provisional hasta O2.4: la UI todavía no envía los tres registries.
    // Los registries son NOT NULL en el esquema (RF-W-11, fail-closed), por lo que
    // se toman del artefacto de despliegue de `rwa-sc` mientras la UI no los envíe.
    const identityRegistry =
      optionalString(body.identityRegistry, 'identityRegistry') ?? getContractAddress('IdentityRegistry');
    const trustedIssuersRegistry =
      optionalString(body.trustedIssuersRegistry, 'trustedIssuersRegistry') ??
      getContractAddress('TrustedIssuersRegistry');
    const claimTopicsRegistry =
      optionalString(body.claimTopicsRegistry, 'claimTopicsRegistry') ?? getContractAddress('ClaimTopicsRegistry');

    const created = await repos.tokens.create({
      tokenAddress,
      adminAddress,
      name,
      symbol,
      decimals,
      identityRegistry,
      trustedIssuersRegistry,
      claimTopicsRegistry,
      requiredClaims: requiredIntegerArray(body.requiredClaims, 'requiredClaims'),
      complianceModules: optionalStringArray(body.complianceModules, 'complianceModules'),
      complianceAddress: optionalString(body.complianceAddress, 'complianceAddress'),
      description: optionalString(body.description, 'description'),
      transactionHash: optionalString(body.transactionHash, 'transactionHash'),
      blockNumber: optionalNumber(body.blockNumber, 'blockNumber'),
    });

    const withRel = await repos.tokens.findWithRelationsById(created.id);
    if (!withRel) throw new NotFoundError('token', created.id);

    return NextResponse.json(
      {
        success: true,
        data: toTokenDto(withRel.token, withRel),
        message: 'Token registrado',
      },
      { status: 201 },
    );
  } catch (error) {
    const { status, body } = toErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${field}" es obligatorio`, field);
  }
  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new ValidationError(`"${field}" debe ser texto`, field);
  return value;
}

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`"${field}" debe ser numérico`, field);
  }
  return value;
}

function requiredDecimals(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 18) {
    throw new ValidationError('"decimals" debe ser un entero entre 0 y 18', 'decimals');
  }
  return value;
}

function requiredIntegerArray(value: unknown, field: string): number[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new ValidationError(`"${field}" debe ser un array de enteros`, field);
  }
  const result: number[] = [];
  for (const item of value) {
    if (typeof item !== 'number' || !Number.isInteger(item)) {
      throw new ValidationError(`"${field}" debe ser un array de enteros`, field);
    }
    result.push(item);
  }
  return result;
}

function optionalStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new ValidationError(`"${field}" debe ser un array de direcciones`, field);
  }
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new ValidationError(`"${field}" debe ser un array de direcciones`, field);
    }
    result.push(item);
  }
  return result;
}
