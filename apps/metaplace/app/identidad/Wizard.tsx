"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Access { hasSocio: boolean; hasKyc: boolean; approvedCredentials: string[] }
interface Identity { display_alias: string; kyc_level: number }

const STEPS = ["Conectar wallet", "Crear identidad", "Completar KYC", "Obtener Socio"] as const;

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const session = await fetch("/api/auth/session");
    if (session.status === 401) { setStep(0); return; }
    setStep(1);

    const identityRes = await fetch("/api/identity");
    if (identityRes.status === 404) return;
    const identityBody = (await identityRes.json()) as { data?: Identity };
    setIdentity(identityBody.data ?? null);
    setStep(2);

    const accessRes = await fetch("/api/access");
    const accessBody = (await accessRes.json()) as { data?: Access };
    setAccess(accessBody.data ?? null);
    if (accessBody.data?.hasSocio) setStep(4);
    else if (accessBody.data?.hasKyc) setStep(3);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const isDone = (index: number) => step > index;

  return (
    <section style={{ marginTop: 24 }}>
      <ol style={{ display: "flex", gap: 8, listStyle: "none", padding: 0, flexWrap: "wrap" }}>
        {STEPS.map((label, i) => (
          <li key={label} style={{
            flex: "1 1 160px",
            border: `1px solid ${isDone(i) ? "#2f8f5b" : i === step ? "#3b6cff" : "#202a4d"}`,
            borderRadius: 10, padding: 12,
            background: isDone(i) ? "#10281c" : i === step ? "#121936" : "#0e1428",
            color: isDone(i) || i === step ? "#e8ecf7" : "#66739a",
            fontSize: 13,
          }}>
            <strong>{i + 1}. {label}</strong>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div style={panel}>
          <p style={{ marginTop: 0 }}>Conecta tu wallet y firma el mensaje de acceso para crear tu identidad.</p>
          <Link href="/login" style={primary}>Entrar con wallet</Link>
        </div>
      )}

      {step >= 1 && !identity && step < 2 && (
        <div style={panel}>
          <p style={{ marginTop: 0 }}>Wallet autenticada. Crea tu identidad seudónima para continuar.</p>
          <button type="button" style={primary} onClick={async () => {
            const res = await fetch("/api/identity", { method: "POST" });
            if (!res.ok) { setError("No se pudo crear la identidad."); return; }
            await load();
          }}>Crear mi identidad</button>
        </div>
      )}

      {identity && (
        <div style={panel}>
          <p style={{ marginTop: 0 }}>Identidad: <strong>{identity.display_alias}</strong></p>
          {step === 2 && (
            <p style={{ color: "#a9b4cc" }}>
              Siguiente: solicita tu certificado KYC. El Operador revisará tus documentos.
              <br />
              <Link href="/identidad/claims?program=kyc-base&credential=KYC" style={{ color: "#7aa2ff" }}>Ir a solicitar KYC</Link>
            </p>
          )}
          {step === 3 && (
            <p style={{ color: "#a9b4cc" }}>
              Ya tienes KYC. Siguiente paso: obtén el certificado de Socio para operar en el Metaplace.
              <br />
              <Link href="/identidad/claims?program=onboarding-socio&credential=SOCIO" style={{ color: "#7aa2ff" }}>Solicitar socio</Link>
            </p>
          )}
          {step >= 4 && (
            <p style={{ color: "#9fd2a8" }}>
              ¡Listo! Eres Socio del Metaplace. Ya puedes comprar, vender e intercambiar en el catálogo.
              <br />
              <Link href="/catalogo" style={{ color: "#7aa2ff" }}>Explorar catálogo</Link>
            </p>
          )}
        </div>
      )}

      {error && <p style={{ color: "#ff8f8f" }}>{error}</p>}
    </section>
  );
}

const panel: React.CSSProperties = { marginTop: 16, border: "1px solid #202a4d", borderRadius: 12, padding: 20, background: "#121936" };
const primary: React.CSSProperties = { display: "inline-block", marginTop: 10, background: "#3b6cff", color: "white", border: 0, borderRadius: 8, padding: "10px 18px", cursor: "pointer", textDecoration: "none" };
