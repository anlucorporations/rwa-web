import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Health mínimo del shell (C1). La verificación completa de RPC + PostgreSQL se
 * añade con la capa de datos de C1; aquí se reporta la configuración de red.
 */
export function GET() {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337");
  return NextResponse.json({
    success: true,
    data: {
      status: "ok",
      chainId,
      rpcConfigured: Boolean(process.env.NEXT_PUBLIC_RPC_URL),
      database: "unconfigured",
    },
  });
}
