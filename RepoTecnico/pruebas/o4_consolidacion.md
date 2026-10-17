# Evidencia O4 — Consolidación en monorepo (parcial: 4.1, 4.4, 4.5) · 2026-10-17

> **Ciclo:** O4 (plan §O4) · **Requisitos:** RF-W-14, RF-W-18, RT-W-05 · **Decisión:** D-089.
> **Estado:** O4.1 ✅ · O4.4 ✅ · O4.5 ✅ · O4.2/O4.3/O4.6/O4.7 ⏳.

## O4.1 · Estructura del monorepo

```
rwa-web/
├── apps/
│   ├── identity/      @rwa/identity   (antes web-identity,         puerto 4001)
│   ├── issuer/        @rwa/issuer     (antes web-registry-trusted, puerto 4002)
│   └── token/         @rwa/token      (antes web-token,            puerto 4003)
├── packages/
│   └── shared/        @rwa/shared     (red, contratos generados, datos, auth, claims, media, logger)
├── pnpm-workspace.yaml   → packages/* + apps/*
├── pnpm-lock.yaml        (único)
└── scripts/  (.gitlab-ci.yml · ci_local.sh · gates · E2E)
```

- `git mv` de las 3 apps (`node_modules` y `.env.local` se movieron con ellas; las claves foráneas
  de `@rwa/shared` las regeneró `pnpm install`).
- Nombres de paquete normalizados `@rwa/{identity,issuer,token}`; scripts raíz y runner actualizados.
- `pnpm install` → *Done in 28.4s*; `pnpm -r exec pwd` reconoce 4 workspaces.
- Rutas de los scripts de gates/E2E actualizadas a `apps/*`.

**Gate:** `./scripts/ci_local.sh` → **exit 0** (literales · deriva · tsc · eslint · build ×3 · tests 25/25).

## O4.4 · Destino de `web-registry-trusted2` → **retirada** ✅

Duplicado experimental del panel de emisor (H-08 del informe de contratos) con ABIs de una generación
distinta y sin puerto ni documentación. El panel canónico es `apps/issuer`. **Retirada** (no aporta
cobertura funcional y multiplica el mantenimiento).

## O4.5 · Destino de `web-rwa` → **retirada** ✅

Landing de 164 líneas con enlaces a puertos inexistentes (3004/3005/3006). El objetivo de la etapa es
**3 apps**; se retira. Si más adelante se quiere un portal, se añadirá como página estática dentro de
`apps/identity` o como app propia con enlaces configurables.

## Pendiente del ciclo

| Tarea | Estado | Nota |
|---|---|---|
| O4.2 `packages/shared` completo (esquemas `zod`, cliente de API tipado, `packages/{ui,config}`) | ⏳ | base ya existente en `packages/shared`; falta validación `zod` en rutas |
| O4.3 Eliminar duplicados (`TrustedIssuersRegistry` ×2, `RequestDetailModal` ×2, tipos repetidos) | ⏳ | siguiente |
| O4.6 Unificar web3 en `wagmi`+`viem` y eliminar `window.ethereum` | ⏳ | cambio grande; varias rondas |
| O4.7 Estado de datos con TanStack Query | ⏳ | — |

*Fin de la evidencia parcial — O4.1/O4.4/O4.5*
