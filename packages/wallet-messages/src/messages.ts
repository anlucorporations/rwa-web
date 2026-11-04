/**
 * Catálogo de plantillas de mensajes de firma en lenguaje llano (RF-V3-21).
 *
 * Fuente de verdad de producto: las mismas plantillas sembradas en
 * `rwa.wallet_messages` (8 procesos × es/en). Este paquete las consume la UI
 * para construir el texto legible ANTES de pedir la firma a la billetera.
 *
 * Reglas (RNF-V3-04): título ≤ 40 caracteres, texto ≤ 200, 0 jerga técnica.
 */

export type Locale = "es" | "en";

export type ProcessKey =
  | "identity.create"
  | "claim.request"
  | "claim.issue"
  | "asset.tokenize"
  | "order.buy"
  | "service.consume"
  | "identity.recovery"
  | "guarantee.consent";

export interface WalletMessageTemplate {
  readonly processKey: ProcessKey;
  readonly locale: Locale;
  readonly title: string;
  /** Texto con variables entre llaves: `{nombre}`. */
  readonly template: string;
  /** Variables declaradas que el template puede usar. */
  readonly variables: readonly string[];
}

/** Procesos con firma en billetera (eje RF-V3-21). */
export const PROCESS_KEYS: readonly ProcessKey[] = [
  "identity.create",
  "claim.request",
  "claim.issue",
  "asset.tokenize",
  "order.buy",
  "service.consume",
  "identity.recovery",
  "guarantee.consent",
];

/** Catálogo completo (8 procesos × 2 idiomas). */
export const WALLET_MESSAGES: readonly WalletMessageTemplate[] = [
  {
    processKey: "identity.create",
    locale: "es",
    title: "Crear tu identidad en Barlo",
    template:
      "Vas a crear tu identidad en Barlo. No compartimos tus datos ni el saldo de tu billetera con nadie.",
    variables: [],
  },
  {
    processKey: "identity.create",
    locale: "en",
    title: "Create your Barlo identity",
    template:
      "You are creating your Barlo identity. We never share your data or your wallet balance.",
    variables: [],
  },
  {
    processKey: "claim.request",
    locale: "es",
    title: "Solicitar un certificado",
    template:
      "Vas a pedir tu certificado de {credencial}. Revisaremos tus documentos y te avisaremos.",
    variables: ["credencial"],
  },
  {
    processKey: "claim.request",
    locale: "en",
    title: "Request a certificate",
    template:
      "You are requesting your {credencial} certificate. We will review your documents and let you know.",
    variables: ["credencial"],
  },
  {
    processKey: "claim.issue",
    locale: "es",
    title: "Emitir un certificado",
    template: "Firmas que {emisor} certifica que cumples los requisitos de {credencial}.",
    variables: ["emisor", "credencial"],
  },
  {
    processKey: "claim.issue",
    locale: "en",
    title: "Issue a certificate",
    template: "You sign that {emisor} certifies you meet the requirements for {credencial}.",
    variables: ["emisor", "credencial"],
  },
  {
    processKey: "asset.tokenize",
    locale: "es",
    title: "Crear un activo digital",
    template:
      "Vas a crear {cantidad} {unidad} de {activo}, respaldados por el certificado de Garantía.",
    variables: ["cantidad", "unidad", "activo"],
  },
  {
    processKey: "asset.tokenize",
    locale: "en",
    title: "Create a digital asset",
    template:
      "You are creating {cantidad} {unidad} of {activo}, backed by the Guarantee certificate.",
    variables: ["cantidad", "unidad", "activo"],
  },
  {
    processKey: "order.buy",
    locale: "es",
    title: "Comprar en el Metaplace",
    template:
      "Compras {activo} por {precio} BRLT. El pago queda retenido hasta que confirmes la recepción.",
    variables: ["activo", "precio"],
  },
  {
    processKey: "order.buy",
    locale: "en",
    title: "Buy in the Metaplace",
    template:
      "You buy {activo} for {precio} BRLT. Payment is held until you confirm reception.",
    variables: ["activo", "precio"],
  },
  {
    processKey: "service.consume",
    locale: "es",
    title: "Usar un servicio",
    template: "Confirmas que usaste {servicio}; su certificado digital se destruye.",
    variables: ["servicio"],
  },
  {
    processKey: "service.consume",
    locale: "en",
    title: "Use a service",
    template: "You confirm you used {servicio}; its digital certificate is destroyed.",
    variables: ["servicio"],
  },
  {
    processKey: "identity.recovery",
    locale: "es",
    title: "Recuperar tu identidad",
    template:
      "Pides recuperar tu identidad. Un administrador revisará tu caso y te contactará.",
    variables: [],
  },
  {
    processKey: "identity.recovery",
    locale: "en",
    title: "Recover your identity",
    template:
      "You are requesting identity recovery. An administrator will review your case and contact you.",
    variables: [],
  },
  {
    processKey: "guarantee.consent",
    locale: "es",
    title: "Respaldar un activo",
    template:
      "Vas a aceptar respaldar {activo} como fiador. Podrás revocar el respaldo antes de la venta.",
    variables: ["activo"],
  },
  {
    processKey: "guarantee.consent",
    locale: "en",
    title: "Back an asset",
    template:
      "You are accepting to back {activo} as guarantor. You can revoke it before the sale.",
    variables: ["activo"],
  },
];
