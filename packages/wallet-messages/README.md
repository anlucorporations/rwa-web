# @rwa/wallet-messages

Plantillas de mensajes de firma en lenguaje llano (RF-V3-21) para las 8 operaciones que firma el
usuario (identidad, claims, tokenización, compra, servicio, recuperación y consentimiento de fianza),
en español e inglés.

- `renderMessage(processKey, locale, values)` → `{ title, text }`.
- `checkCatalog()` / `checkLegibility()` → verificación de los umbrales RNF-V3-04
  (título ≤ 40, texto ≤ 200, 0 jerga técnica).
- Test: `pnpm --filter @rwa/wallet-messages test`.
