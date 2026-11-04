/**
 * Construcción y verificación de mensajes de firma legibles (RF-V3-21 / RNF-V3-04).
 */
import { PROCESS_KEYS, WALLET_MESSAGES, type Locale, type ProcessKey, type WalletMessageTemplate } from "./messages";

export const MAX_TITLE_LENGTH = 40;
export const MAX_TEXT_LENGTH = 200;

/** Términos técnicos que no deben aparecer en un mensaje para usuario común. */
export const FORBIDDEN_JARGON: readonly string[] = [
  "EIP-712",
  "nonce",
  "hash",
  "digest",
  "smart contract",
  "contrato inteligente",
  "wei",
  "gas",
  "ABI",
];

export interface RenderedMessage {
  readonly processKey: ProcessKey;
  readonly locale: Locale;
  readonly title: string;
  readonly text: string;
}

export class MissingVariableError extends Error {
  constructor(public readonly variable: string, processKey: string) {
    super(`Falta la variable "${variable}" para ${processKey}`);
    this.name = "MissingVariableError";
  }
}

export class UnknownProcessError extends Error {
  constructor(processKey: string) {
    super(`Proceso de firma desconocido: ${processKey}`);
    this.name = "UnknownProcessError";
  }
}

export function getTemplate(processKey: string, locale: Locale): WalletMessageTemplate {
  const found = WALLET_MESSAGES.find((m) => m.processKey === processKey && m.locale === locale);
  if (!found) throw new UnknownProcessError(`${processKey}/${locale}`);
  return found;
}

/** Sustituye `{variable}` por su valor; falla si falta alguna variable. */
export function interpolate(template: string, values: Readonly<Record<string, string>>, processKey = ""): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name: string) => {
    const value = values[name];
    if (value === undefined) throw new MissingVariableError(name, processKey);
    return value;
  });
}

/** Devuelve el mensaje legible que se mostrará antes de firmar. */
export function renderMessage(
  processKey: ProcessKey,
  locale: Locale,
  values: Readonly<Record<string, string>>,
): RenderedMessage {
  const tpl = getTemplate(processKey, locale);
  return {
    processKey,
    locale,
    title: tpl.title,
    text: interpolate(tpl.template, values, processKey),
  };
}

export interface LegibilityViolation {
  readonly processKey: string;
  readonly locale: Locale;
  readonly rule: string;
  readonly detail: string;
}

export interface LegibilityResult {
  readonly ok: boolean;
  readonly violations: readonly LegibilityViolation[];
}

/** Comprueba un mensaje ya renderizado contra los umbrales numéricos. */
export function checkLegibility(message: RenderedMessage): LegibilityResult {
  const violations: LegibilityViolation[] = [];
  const base = { processKey: message.processKey, locale: message.locale };
  if (message.title.length > MAX_TITLE_LENGTH) {
    violations.push({ ...base, rule: "title_length", detail: `${message.title.length} > ${MAX_TITLE_LENGTH}` });
  }
  if (message.text.length > MAX_TEXT_LENGTH) {
    violations.push({ ...base, rule: "text_length", detail: `${message.text.length} > ${MAX_TEXT_LENGTH}` });
  }
  const lower = `${message.title} ${message.text}`.toLowerCase();
  for (const term of FORBIDDEN_JARGON) {
    if (lower.includes(term.toLowerCase())) {
      violations.push({ ...base, rule: "jargon", detail: term });
    }
  }
  return { ok: violations.length === 0, violations };
}

/** Verificación estática del catálogo (la usa el gate `check-wallet-messages` de CI). */
export function checkCatalog(): LegibilityResult {
  const violations: LegibilityViolation[] = [];
  for (const processKey of PROCESS_KEYS) {
    for (const locale of ["es", "en"] as const) {
      const tpl = getTemplate(processKey, locale);
      const base = { processKey, locale };
      const placeholders = [...tpl.template.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]);
      const declared = new Set(tpl.variables);
      for (const ph of placeholders) {
        if (!declared.has(ph)) {
          violations.push({ ...base, rule: "undeclared_variable", detail: ph });
        }
      }
      for (const v of tpl.variables) {
        if (!placeholders.includes(v)) {
          violations.push({ ...base, rule: "unused_variable", detail: v });
        }
      }
      if (tpl.title.length > MAX_TITLE_LENGTH) {
        violations.push({ ...base, rule: "title_length", detail: `${tpl.title.length} > ${MAX_TITLE_LENGTH}` });
      }
      const sample = Object.fromEntries(tpl.variables.map((v) => [v, "X"]));
      const rendered = interpolate(tpl.template, sample, processKey);
      if (rendered.length > MAX_TEXT_LENGTH) {
        violations.push({ ...base, rule: "text_length", detail: `${rendered.length} > ${MAX_TEXT_LENGTH}` });
      }
      const lower = `${tpl.title} ${rendered}`.toLowerCase();
      for (const term of FORBIDDEN_JARGON) {
        if (lower.includes(term.toLowerCase())) {
          violations.push({ ...base, rule: "jargon", detail: term });
        }
      }
    }
  }
  return { ok: violations.length === 0, violations };
}
