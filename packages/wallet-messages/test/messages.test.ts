import { describe, expect, it } from "vitest";
import {
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  PROCESS_KEYS,
  WALLET_MESSAGES,
  checkCatalog,
  checkLegibility,
  getTemplate,
  interpolate,
  MissingVariableError,
  UnknownProcessError,
  renderMessage,
} from "../src/index";

describe("catálogo de mensajes de firma", () => {
  it("tiene los 8 procesos con es y en", () => {
    expect(PROCESS_KEYS).toHaveLength(8);
    for (const key of PROCESS_KEYS) {
      expect(getTemplate(key, "es").locale).toBe("es");
      expect(getTemplate(key, "en").locale).toBe("en");
    }
    expect(WALLET_MESSAGES).toHaveLength(16);
  });

  it("no tiene duplicados proceso+idioma", () => {
    const ids = WALLET_MESSAGES.map((m) => `${m.processKey}/${m.locale}`);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("el catálogo completo cumple los umbrales de legibilidad", () => {
    const result = checkCatalog();
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("ningún template usa variables no declaradas ni al revés", () => {
    for (const tpl of WALLET_MESSAGES) {
      const placeholders = [...tpl.template.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]);
      expect(new Set(placeholders)).toEqual(new Set(tpl.variables));
    }
  });
});

describe("render de mensajes", () => {
  it("interpola las variables", () => {
    const msg = renderMessage("order.buy", "es", { activo: "Café", precio: "10" });
    expect(msg.text).toContain("Café");
    expect(msg.text).toContain("10 BRLT");
    expect(msg.text).not.toContain("{");
  });

  it("falla si falta una variable", () => {
    expect(() => interpolate("Hola {nombre}", {}, "identity.create")).toThrow(MissingVariableError);
  });

  it("falla con un proceso desconocido", () => {
    expect(() => getTemplate("no.existe", "es")).toThrow(UnknownProcessError);
  });

  it("los mensajes renderizados respetan título y texto", () => {
    const messages = [
      renderMessage("identity.create", "es", {}),
      renderMessage("claim.request", "es", { credencial: "Socio" }),
      renderMessage("claim.issue", "es", { emisor: "Emisor KYC", credencial: "KYC" }),
      renderMessage("asset.tokenize", "es", { cantidad: "100", unidad: "unidades", activo: "Café" }),
      renderMessage("order.buy", "es", { activo: "Café", precio: "10" }),
      renderMessage("service.consume", "es", { servicio: "Tour" }),
      renderMessage("identity.recovery", "es", {}),
      renderMessage("guarantee.consent", "es", { activo: "Café" }),
    ];
    for (const msg of messages) {
      expect(msg.title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
      expect(msg.text.length).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
      expect(checkLegibility(msg).ok).toBe(true);
    }
  });
});
