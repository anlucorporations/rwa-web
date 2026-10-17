# Evidencia O3 — Verificabilidad (parcial: 3.1–3.4) · 2026-10-17

> **Ciclo:** O3 (plan §O3) · **Requisitos:** RF-W-15, RNF-W-03, RNF-W-07 · **Decisión:** D-094.
> **Estado:** O3.1–O3.5 y O3.7 ✅ · O3.6 **parcial** (Vitest ✅ · Playwright diferido).

## O3.1 · Repositorio y plantillas de entorno

- Repositorio `rwa-web` **ya creado** (D-094) en la rama `rwa-web-DSH`, con historia completa
  (commits por ciclo/tarea) y **sin remoto** (el `push` requiere orden explícita).
- `.env.example` **raíz** (valores reales de GCP) + **uno por app** (`web-identity`,
  `web-registry-trusted`, `web-token`) con las variables que consume cada una.

## O3.2 · `.env` fuera del árbol

```
$ git check-ignore -v .env .env.local web-*/env.local
.env                    .gitignore:17:.env
.env.local              .gitignore:19:.env*.local
web-identity/.env.local              web-identity/.gitignore:33:.env*
web-registry-trusted/.env.local      web-registry-trusted/.gitignore:34:.env*
web-token/.env.local                 web-token/.gitignore:35:.env*
$ git ls-files | grep -E '(^|/)\.env'
.env.example
web-registry-trusted2/.env.example
```
✅ Ningún `.env`/`.env.local` versionado; solo plantillas. Los secretos reales viven en
Secret Manager / `.env.local` de desarrollo (gitignored).

## O3.3 · Versiones únicas (RNF-W-03)

| Dependencia | Antes | Ahora |
|---|---|---|
| `next` | `^16.0.12`, `16.0.1`, `16.0.1` | **`16.1.6`** (única) |
| `react` / `react-dom` | `19.2.0` | **`19.2.3`** (única) |
| `eslint-config-next` | `16.0.1`, `16.0.1`, `^16.1.6` | **`16.1.6`** (única) |

Un único `pnpm-lock.yaml` para el workspace (`pnpm install` → *Done in 33.4s*).
`web-rwa` y `web-registry-trusted2` siguen fuera del workspace hasta su decisión en O4.

## O3.4 · `ignoreBuildErrors` retirado y tipos en verde (RNF-W-03)

- Eliminado `typescript.ignoreBuildErrors` de los 3 `next.config.ts`.
- `tsc --noEmit`: **0 errores** en las 3 apps (antes: 3 en `web-registry-trusted` y 2 en `web-token`).
- Correcciones:
  - `tsconfig.target` de `web-registry-trusted` y `web-token`: ES2017 → **ES2020** (BigInt).
  - `web-token/app/marketplace/page.tsx`: faltaba `import { ethers } from 'ethers'`.
  - `web-registry-trusted/app/dashboard/page.tsx`: guard de `window.ethereum` antes de `BrowserProvider`.
  - **Eliminados** `app/page-new-design.tsx` y `app/landing-page.tsx` (landings duplicadas y muertas, HW-09/M-9;
    también eliminan 11 `console.*`).
- `next build` de las 3 apps con el chequeo de tipos activo: **exit 0** (229 s / 179 s / 150 s).

## Gate reproducible

```bash
for d in web-identity web-registry-trusted web-token; do (cd $d && npx tsc --noEmit); done   # 0 errores
for d in web-identity web-registry-trusted web-token; do (cd $d && npx next build); done     # exit 0
./scripts/check-network-literals.sh      # 0 literales
./scripts/check-contract-drift.sh        # 0 deriva
git check-ignore .env.local              # ignorado
```

## O3.5 · Pipeline de CI y runner local

- **`.gitlab-ci.yml`**: etapas `validate` (network-literals + ABI-drift) → `quality` (`typecheck`, `lint`)
  → `build`. Node 22 + pnpm 9.15.9, `--frozen-lockfile`, caché del store. El gate de deriva clona
  `rwa-sc` con `RWA_SC_REPO_URL` (variable de CI con token de lectura) y falla de forma explícita si falta.
- **`scripts/ci_local.sh`** (y `pnpm ci`): ensayo local del mismo pipeline, secuencial
  (`--workspace-concurrency=1`) para no saturar RAM/disco: gates → typecheck → lint → build → test.
- `typecheck` añadido a los `package.json` de las 3 apps; `lint` configurado también en `packages/shared`
  (con `eslint` + `typescript-eslint`).
- **Lint en 0 errores** (antes: 25/14/34). Deuda declarada como *warning* (no bloquea): reglas del
  React Compiler (`react-hooks/*`) y `@typescript-eslint/no-explicit-any`, a refactorizar en O4.
- **Eliminados** los `docker-build/` de las 3 apps (HW-11) y añadidos a `.gitignore`; eliminados los
  `package-lock.json` de las apps del workspace (un único `pnpm-lock.yaml`, O3.3).

**Salida real:**
```
▶ 1/6 Gate de literales de red        ✓ 0 literales
▶ 2/6 Gate de deriva de ABIs          ✓ sincronizados
▶ 3/6 TypeScript                      ✓ 4 paquetes
▶ 4/6 ESLint                          ✓ 0 errores
▶ 5/6 Build de producción             ✓ exit 0 ×3
▶ 6/6 Tests                           ✓ (sin tests aún: O3.6)
✓ CI local en verde
```

## O3.7 · Logging estructurado y `0 console.*` (RF-W-16, RT-W-10)

- Las **rutas de API ya usaban `logger`** (`pino`) desde O0/O1 (vía `toErrorResponse`); no tenían `console.*`.
- **224 llamadas `console.*` eliminadas** de componentes, páginas, contextos y libs de las 3 apps
  (depuración heredada). Reemplazadas por eliminación de la sentencia cuando era aislada y por `void 0`
  cuando era parte de una expresión, preservando la compilación.
- **Blindaje**: regla `no-console: error` en los 3 `eslint.config.mjs` → el CI impide reintroducirlos.
- **Eliminados** `web-token/VERIFY_TOKEN.js` (script de depuración obsoleto con direcciones hardcodeadas),
  `app/page-new-design.tsx` y `app/landing-page.tsx` (muertos).
- `console.*` restantes en `app/`, `components/`, `lib/` y `contexts/`: **0**.
- Avisos residuales (no bloquean): `@typescript-eslint/no-unused-vars` en bloques `catch (error)` cuyo
  log se eliminó (se limpiarán en O4).

**Gate:** `./scripts/ci_local.sh` → exit 0 (lint 0 errores · tsc 0 · build ×3 · gates).

## O3.6 · Tests (parcial)

### Vitest en el paquete compartido — ✅
`vitest` + `packages/shared/vitest.config.ts`; **25 tests** en 4 suites, todos en verde:

| Suite | Cubre |
|---|---|
| `src/claims/eip712.test.ts` (6) | dominio EIP-712, 7 campos del `Claim` en orden, `dataHash`/`uriHash`, firma tipada real con `viem` + recuperación del emisor, coherencia con la solicitud, firma mal formada |
| `src/auth/cookie.test.ts` (7) | HMAC de la cookie, `HttpOnly`/`SameSite=Strict`/`Secure`, tampering, cookie de borrado, lectura de cabecera, secreto obligatorio (fail-closed) |
| `src/media/magic-bytes.test.ts` (8) | detección PDF/JPEG/PNG/DOC/DOCX, coincidencia con el tipo declarado, `image/jpg`, rechazos; saneado anti-inyección |
| `src/api/serializers.test.ts` (4) | DTO de solicitud con payload EIP-712, sin payload, emisor, token con relaciones |

```
$ pnpm --filter @rwa/shared test
 Test Files  4 passed (4)
      Tests  25 passed (25)
```
El paso `test` del CI ya ejecuta `pnpm -r --if-present test` (el paquete compartido lo tiene).

### E2E Playwright del flujo claim→aprobación — ⏳ diferido
El flujo **ya está cubierto de extremo a extremo con criptografía real** por
`scripts/test_review_o1.sh` (sesiones SIWE + firmas EIP-712) y `scripts/test_e2e_o2.sh`
(identidad → `addClaim` → `hasVerified`). Un Playwright de navegador exigiría
**automatizar MetaMask/wallet** en headless (el flujo requiere `personal_sign` y
`signTypedData`), lo que no aporta cobertura sobre lo ya verificado y añade un
andamiaje (Synpress/mock de provider) desproporcionado para esta etapa.
**Deuda declarada:** se incorporará cuando exista un entorno con navegador y estrategia
de wallet de test (junto a O5, contenedores/e2e de UI).

*Fin de la evidencia parcial — O3.1–O3.5, O3.7 y O3.6 (parcial)*
