# 🤝 Contrato de Integración `@sc` ↔ `@web` — RWA

> **Versión:** v1.0 · **Fecha:** 2026-10-24 · **Estado:** vigente
> **Propósito:** formalizar cómo se acoplan las dos líneas de desarrollo (`rwa-sc` contratos y `rwa-web` interfaces) para que se comporten como **un solo proyecto** de forma reproducible y verificable.
> **Origen:** resuelve el hallazgo **H-08** del [INFORME_SINCRONIZACION_LINEAS_V1.md](INFORME_SINCRONIZACION_LINEAS_V1.md) y consolida las decisiones **D-102** (separación de líneas) y **RF-W-09** (ABIs/direcciones desde artefactos).

---

## 1. Fuentes de verdad

| Dato | Fuente de verdad (solo `@sc`) | Consumo en `@web` |
|---|---|---|
| ABIs de contratos | `rwa-sc/sc/abis/*.json` | Generadas en `packages/shared/src/contracts/abis/` |
| Direcciones / despliegue | `rwa-sc/sc/deployments/<chainId>-<timestamp>.json` (el más reciente) | Generado en `packages/shared/src/contracts/deployments.ts` y `.env.example` |
| Modelo de datos | `rwa-sc/RepoTecnico/{base_datos.sql,diccionario_datos.md,diagrama_er.md}` (canónico) | Espejo byte a byte en `rwa-web/RepoTecnico/` |
| Esquema off-chain | `rwa-sc/RepoTecnico/base_datos.sql` | PostgreSQL (Cloud SQL, esquema `rwa`) |

**Regla de oro:** `@web` **nunca** escribe ABIs ni direcciones a mano. Se regeneran con `scripts/sync-contracts.sh` y el gate `check-contract-drift.sh` falla si hay deriva.

## 2. Artefactos derivados (generados, no editar)

| Artefacto `@web` | Generado por |
|---|---|
| `packages/shared/src/contracts/abis/*.ts` | `scripts/sync-contracts.sh` (desde `sc/abis`) |
| `packages/shared/src/contracts/deployments.ts` | `scripts/sync-contracts.sh` (desde el último `sc/deployments/*.json`) |
| `packages/shared/src/contracts/index.ts` | idem |

Los ficheros generados llevan cabecera `NO EDITAR`; el commit debe incluir **a la vez** el artefacto de `@sc` y el módulo regenerado de `@web`.

## 3. Versionado y pin reproducible

- La CI de `@web` clona `rwa-sc` desde `RWA_SC_REPO_URL` (variable con token de lectura).
- **`RWA_SC_REF`** fija el SHA/tag de `rwa-sc` que se valida. **Debe fijarse al commit publicado** en cada release de `@sc`; vacío = HEAD de la rama por defecto (no reproducible → solo para desarrollo).
- Al cambiar `@sc`: actualizar `RWA_SC_REF` **y** regenerar el módulo de `@web` en el mismo turno.
- El espejo de artefactos de datos se rige por [ARTEFACTOS_DATOS_SINCRONIZADOS.md](ARTEFACTOS_DATOS_SINCRONIZADOS.md).

## 4. Reglas de compatibilidad

1. **Aditivo** (nueva función/evento/error): permitido; `@web` regenera y sigue.
2. **Cambio de firma, evento o semántica** (*breaking*): requiere (a) regenerar `@web`, (b) actualizar el flujo/UI afectado, (c) entrada en `rwa-sc/CHANGELOG_ABIS.md`, (d) nuevo despliegue si cambian direcciones.
3. **Nuevo despliegue canónico:** versionar el artefacto en `@sc` **antes** de consumirlo en `@web` (gate H-01).
4. **Sin literales de red** en `@web` (direcciones, RPC, chainId): gate `check-network-literals.sh`.
5. **Sin claves privadas** en código de producción: gate `check-no-private-keys.sh`.

## 5. Gates de integración

| Gate | Comando | Criterio | Dónde corre |
|---|---|---|---|
| Literales de red | `scripts/check-network-literals.sh` | 0 literales | CI (`validate:network-literals`) · `ci_local` 1/8 |
| Claves privadas | `scripts/check-no-private-keys.sh` | 0 claves en producción | CI (`validate:network-literals`) · `ci_local` 1/8 |
| Deriva ABI/direcciones + despliegue versionado + doc | `scripts/check-contract-drift.sh` | exit 0 contra `RWA_SC_REF` | CI (`validate:abi-drift`) · `ci_local` 2/8 |
| Espejo de datos (D-102) | `RepoTecnico/check_sincronizacion_datos.sh --check` | 3/3 idénticos | CI (`validate:abi-drift`) · `ci_local` 3/8 |
| Typecheck / lint / test | `pnpm -r … typecheck|lint|test` | exit 0 | CI (`quality:*`) · `ci_local` 4–5, 8 |
| E2E contrato↔interfaz | `scripts/ci_e2e.sh` | claim-flow en verde | CI (`e2e:claim-flow`, manual/nocturno) |

## 6. Propiedad y roles

| Rol | Responsabilidad |
|---|---|
| **Dueño de contratos (`@sc`)** | Versionar ABIs y **artefactos de despliegue**; actualizar `CHANGELOG_ABIS.md`; publicar el commit y comunicar el SHA. |
| **Dueño de frontend (`@web`)** | Regenerar contratos (`sync-contracts.sh`), actualizar `RWA_SC_REF`, mantener docs y UI alineadas. |
| **Release manager cross-línea** | Fijar el par `rwa-sc@SHA ↔ rwa-web@SHA` en cada release y ejecutar el checklist §7. |
| **Seguridad** | Revisar el gate de claves, cabeceras y flujo SIWE/EIP-712 antes de releases. |

## 7. Checklist de release conjunto

- [ ] `rwa-sc` publicado (remoto) y `RWA_SC_REF` fijado a ese SHA.
- [ ] `scripts/sync-contracts.sh` ejecutado; `git status` sin deriva en `packages/shared/src/contracts/`.
- [ ] `scripts/check-contract-drift.sh` → exit 0.
- [ ] `RepoTecnico/check_sincronizacion_datos.sh --check` → exit 0.
- [ ] `scripts/check-network-literals.sh` y `scripts/check-no-private-keys.sh` → exit 0.
- [ ] `scripts/ci_local.sh` → verde.
- [ ] `e2e:claim-flow` ejecutado en un runner con Chromium + Foundry + `E2E_DATABASE_URL`.
- [ ] Sin cambios sin commitear que afecten a contratos, config o datos.

## 8. Pendientes conocidos (2026-10-24)

| # | Pendiente | Referencia |
|---|---|---|
| 1 | ✅ **Resuelto:** `rwa-sc` publicado (`f946b1e`) y `RWA_SC_REF` fijado a ese SHA | H-02 del informe |
| 2 | `e2e:claim-flow` pendiente de verificar en un runner real (imagen Playwright + Foundry + PostgreSQL); la ejecución local detectó el defecto **H-11** de `@sc` (`deploy.sh` vs Foundry 1.8.3) | H-06 / §5 del registro de resolución |
| 3 | ✅ **Resuelto:** WIP de `@web` commiteado (`080d2ea`, `b17867d`) y versiones documentales alineadas | H-10 |

---

*Documento vivo — actualizar junto con los cambios de integración.*
