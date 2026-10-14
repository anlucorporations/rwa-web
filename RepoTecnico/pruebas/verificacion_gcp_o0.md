# Verificación de servicios GCP — Ciclo O0 (2026-10-14)

> **Línea de desarrollo:** `@web` — este documento vive en `rwa-web/RepoTecnico/pruebas/` (reorganización de las dos líneas, 2026-10-14).
>
> **Objetivo:** comprobar de forma empírica que el frontend `@web` puede y debe usar los dos servicios de GCP
> decididos por el usuario: **Anvil de GCP** (on-chain) y **PostgreSQL en Cloud SQL** (off-chain).
> **Resultado global: ✅ AMBOS SERVICIOS VERIFICADOS Y OPERATIVOS.**
> Sin cambios en `rwa-sc`; el único cambio de datos es la creación del esquema `rwa` (aislado) en la BD `truekeate`.

---

## 1. Anvil de GCP (on-chain)

| Comprobación | Comando | Resultado real |
|---|---|---|
| Endpoint vivo | `curl -X POST $RPC eth_chainId` | `0x7a69` = **31337** ✅ |
| Cliente y altura | `eth_blockNumber` / `web3_clientVersion` | `anvil/v1.5.1`, bloque **546** ✅ |
| RPC declarado en secretos | `gcloud secrets versions access DS_RPC_URL` | `https://mcc-foundry-anvil-1095249147821.europe-west1.run.app` (**coincide**) ✅ |
| Contratos desplegados | `eth_getCode` sobre las 9 direcciones de `sc/deployments/31337-20261010T162639Z.json` | 9/9 con código (factories 3–5 KB; clones EIP-1167 de 45 B) ✅ |
| EIP-712 desplegado | `cast call $IDENTITY "CLAIM_TYPEHASH()(bytes32)"` | `0x8f719673…5a6ead` (**≠ 0**) ✅ |
| RF-004 desplegado | `maxBurnPerTx()` / `maxForcedPerTx()` | `0` / `0` (funciones presentes) ✅ |
| AF-01 desplegado | `aggregator.isModuleActiveForToken(token,mod)` | `true` ✅ |
| Registries del token | `claimTopicsRegistry()` / `trustedIssuersRegistry()` / `identityRegistry()` | `0xafAC67…` / `0x67baFF…` / `0xF5b81Fe0…` (los tres definidos) ✅ |
| Semántica fail-closed | `isVerified(owner)` con topic 1 y sin claim | `false` (comportamiento correcto) ✅ |
| Identidad registrada | `identityRegistry.getIdentity(owner)` | `0x47d480c8…` ✅ |

**Conclusión:** el despliegue del Anvil de GCP **está al día** con los contratos finales (incluye EIP-712,
RF-004 y AF-01). No requiere redeploy para esta etapa.

## 2. PostgreSQL en GCP (off-chain)

| Comprobación | Comando | Resultado real |
|---|---|---|
| Instancia | `gcloud sql instances describe truekeate-db-dev --project=truekeate-main` | `RUNNABLE`, **POSTGRES_15**, región **southamerica-east1-a** ✅ |
| Endpoint | IP pública | `34.39.180.101`, `ipv4Enabled=true`, `requireSsl=false` |
| ACL de red | `settings.ipConfiguration.authorizedNetworks` | `35.232.138.181/32` — **es exactamente la IP de salida de este host** ✅ |
| Conexión | `psql "host=34.39.180.101 … dbname=truekeate user=app"` | `PostgreSQL 15.18 … current_user=app` ✅ |
| Esquema aplicado | `psql -f rwa-sc/RepoTecnico/base_datos.sql` (ON_ERROR_STOP) | **exit 0**, aviso `10 tablas en el esquema rwa` ✅ |
| Contenido | `information_schema.tables` | **10 tablas + 1 vista**, **29 índices** ✅ |
| Semilla | `select * from rwa.claim_topics` | 1 KYC · 7 Accreditation · 9 Jurisdiction · 5/6 reservados ✅ |
| Migración | `select * from rwa.schema_migrations` | `1.0` ✅ |
| Idempotencia | segunda ejecución del script | **exit 0, 0 errores**, 10 tablas / 5 topics ✅ |

**Conexión canónica:** el secreto `DATABASE_URL` (proyecto `truekeate-main`) usa **socket unix**
(`?host=/cloudsql/truekeate-main:southamerica-east1:truekeate-db-dev`), la forma correcta en Cloud Run o con
Cloud SQL Auth Proxy. En este host (proxy no instalado) se usa **TCP a la IP pública**, ya autorizada.

## 3. Hallazgos operativos

| # | Hallazgo | Impacto | Tratamiento |
|---|---|---|---|
| V-1 | `gcloud` de snap (`/snap/bin/gcloud`) **está roto** en este host (`snap-confine … cap_dac_override`) | Bloquea CI/scripts que invoquen `gcloud` a secas | Usar `$HOME/bin/gcloud` (SDK 582.0.0) o `$HOME/google-cloud-sdk/bin`; queda fijado en `rwa-web/scripts/gcp-env.sh` |
| V-2 | `DS_DATABASE_URL` (proyecto `mcc-ecommerce`) **existe pero sin versiones** | Un script que lo lea obtiene cadena vacía | La URL real está en `truekeate-main` → secreto `DATABASE_URL`; documentado |
| V-3 | Región documentada `us-east1` vs real **`southamerica-east1-a`** | Riesgo de provisionar/consultar la instancia equivocada | Corregido en `rwa-sc/RepoTecnico/entornos_globales.md` §14 |
| V-4 | Cloud Run `mcc-postgres-…run.app` devuelve **503** | No sirve como pasarela SQL hoy | Se usa Cloud SQL directo (TCP/socket) |
| V-5 | El ABI del web sigue declarando `maxTotalSupply()` y la factory la acepta como argumento, pero **el código actual no tiene ni la función ni el parámetro** | La llamada de creación de token del web fallaría | Evidencia adicional de **HW-03**; se corrige en O2 |
| V-6 | `cloud-sql-proxy` no instalado | El `DATABASE_URL` canónico (socket) no funciona en local sin él | Dos modos en `scripts/gcp-env.sh`: `--tcp` (este host) y canónico (Cloud Run/proxy) |

## 4. Ficheros creados

- `rwa-web/scripts/gcp-env.sh` — exporta la red y la BD reales de GCP, verifica ambos servicios y aborta si fallan.
- `rwa-web/.env.example` — plantilla sin secretos con los valores de GCP.
- `rwa-sc/RepoTecnico/base_datos.sql` v1.0 — aplicado; esquema `rwa` creado en Cloud SQL.

## 5. Evidencia de reproducción

```bash
# Ambos servicios en una sola orden
cd /home/dsh/workspace/RWA && source rwa-web/scripts/gcp-env.sh --tcp
# [gcp-env] ✓ Anvil de GCP responde: chainId 0x7a69 (31337)
# [gcp-env] ✓ PostgreSQL en GCP (Cloud SQL truekeate-main:southamerica-east1:truekeate-db-dev) — esquema rwa: 10 tablas
```

*Fin del acta — verificacion_gcp_o0.md*
