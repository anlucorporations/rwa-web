# Evidencia O3 — Verificabilidad (parcial: 3.1–3.4) · 2026-10-17

> **Ciclo:** O3 (plan §O3) · **Requisitos:** RF-W-15, RNF-W-03, RNF-W-07 · **Decisión:** D-094.
> **Estado:** O3.1 · O3.2 · O3.3 · O3.4 ✅ · O3.5 (CI) · O3.6 (tests) · O3.7 (logging) ⏳.

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

*Fin de la evidencia parcial — O3.1–O3.4*
