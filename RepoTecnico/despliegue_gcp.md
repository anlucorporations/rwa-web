# ☁️ Despliegue en GCP — apps RWA sobre los servicios globales

> **Fecha de ejecución:** 2026-10-29 · **Proyecto GCP:** `mcc-ecommerce` · **Región:** `europe-west1`
> **Imágenes:** tag `20261029-174915` · **Estado:** ✅ desplegado y verificado (healthchecks + job + scheduler)
> **Reproducible con:** [`../scripts/deploy_gcp.sh`](../scripts/deploy_gcp.sh) + [`../cloudbuild.yaml`](../cloudbuild.yaml)

Este documento registra el despliegue de las **3 apps web** y del **indexer** en Cloud Run usando
los **servicios globales** de la plataforma (sin crear nodos ni bases de datos duplicados), tal
como exigen D-095/D-096/D-097/D-101.

---

## 1. Servicios globales utilizados (no se crean duplicados)

| Servicio global | Recurso | Uso en RWA |
|---|---|---|
| **Foundry / Anvil** | Cloud Run `mcc-foundry-anvil` (proyecto `mcc-ecommerce`, región `europe-west1`) | Red on-chain canónica: `https://mcc-foundry-anvil-1095249147821.europe-west1.run.app`, **chainId 31337**. Direcciones canónicas del artefacto `31337-20261023T185622Z.json` verificadas on-chain (`eth_getCode`, bloque 558) |
| **PostgreSQL** | **Cloud SQL** `truekeate-main:southamerica-east1:truekeate-db-dev` (PG 15.18, usuario `app`, BD `truekeate`) | BD off-chain oficial, **esquema `rwa`** (13 tablas, migraciones 1.0–1.2 aplicadas). Conexión canónica por **socket unix** (`/cloudsql/…`, D-101) |
| Secretos | Secret Manager de `truekeate-main` (`DATABASE_URL`, `SIWE_SESSION_SECRET`, `KYC_ENCRYPTION_KEY`) | Copiados a `mcc-ecommerce` para poder referenciarlos desde Cloud Run del proyecto de apps. **`truekeate-main` sigue siendo el canónico** |

> `mcc-postgres` (Cloud Run) **no se usa**: devuelve 503 y no es pasarela SQL (ver
> `pruebas/verificacion_gcp_o0.md`, V-4). La BD oficial es Cloud SQL.

## 2. Recursos creados en `mcc-ecommerce`

| Recurso | Nombre / URL | Notas |
|---|---|---|
| Cloud Run service | `rwa-identity` → https://rwa-identity-slzlptbcla-ew.a.run.app | App inversor (identidad, claims, documentos) |
| Cloud Run service | `rwa-issuer` → https://rwa-issuer-slzlptbcla-ew.a.run.app | Panel del emisor (EIP-712) |
| Cloud Run service | `rwa-token` → https://rwa-token-slzlptbcla-ew.a.run.app | Factory, compliance y marketplace (legacy) |
| Cloud Run Job | `rwa-indexer` | Indexer off-chain; ejecución `--once` |
| Cloud Scheduler | `rwa-indexer-schedule` | Cron `*/10 * * * *` → ejecuta el job vía API Run (OAuth) |
| Service Account runtime | `rwa-web-run@mcc-ecommerce.iam.gserviceaccount.com` | `roles/cloudsql.client` en `truekeate-main` + `secretmanager.secretAccessor` sobre los 3 secretos |
| Service Account scheduler | `rwa-scheduler@mcc-ecommerce.iam.gserviceaccount.com` | `roles/run.invoker` sobre `rwa-indexer` |
| Imágenes | `europe-west1-docker.pkg.dev/mcc-ecommerce/cloud-run-source-deploy/rwa-{identity,issuer,token,indexer}:20261029-174915` | 4 imágenes (3 apps Next standalone + indexer) |
| Secretos | `DATABASE_URL`, `SIWE_SESSION_SECRET`, `KYC_ENCRYPTION_KEY` en `mcc-ecommerce` | Valores copiados de `truekeate-main` sin imprimirlos ni persistirlos |

### Configuración común de los servicios

- `--add-cloudsql-instances truekeate-main:southamerica-east1:truekeate-db-dev` (socket unix).
- `--set-secrets DATABASE_URL=…,SIWE_SESSION_SECRET=…,KYC_ENCRYPTION_KEY=…`.
- `--set-env-vars NEXT_PUBLIC_CHAIN_ID=31337,NEXT_PUBLIC_RPC_URL=<Anvil global>,RPC_URL=<Anvil global>,PG_POOL_MAX=5,LOG_LEVEL=info,ALLOW_DEBUG_ENDPOINTS=0`.
- `--port 3000`, `1 GiB` RAM, `1` vCPU, concurrencia `80`, `min-instances 0`, `max-instances 3`,
  acceso público (`--allow-unauthenticated`; la autorización real es SIWE + roles on-chain).

## 3. Pipeline reproducible

```bash
cd rwa-web

# 1) Aprovisionamiento idempotente (APIs, SA, secretos, IAM)
./scripts/deploy_gcp.sh provision

# 2) Build de las 4 imágenes en Cloud Build (~9 min)
TAG=$(date -u +%Y%m%d-%H%M%S) ./scripts/deploy_gcp.sh build

# 3) Despliegue de servicios + job
TAG=<tag> ./scripts/deploy_gcp.sh deploy

# 4) Indexer periódico (Cloud Scheduler cada 10 min)
./scripts/deploy_gcp.sh scheduler

# 5) Verificación (health real + job)
./scripts/deploy_gcp.sh verify
```

- `provision` es **idempotente**; `REFRESH_SECRETS=1` fuerza una nueva versión copiada desde
  `truekeate-main` (útil si rota el secreto canónico).
- `build` usa `cloudbuild.yaml` (contexto de 3,3 MiB gracias a `.gcloudignore`; sin
  `node_modules`/`.next`).
- `SECRETS` y nombres son parametrizables por variables de entorno (`GCP_PROJECT_ID`,
  `GCP_REGION_RUN`, `GCP_DB_PROJECT`, `GCP_SQL_CONN`, `RPC_URL`, `TAG`…).

## 4. Evidencia de verificación (2026-10-29)

| Comprobación | Resultado |
|---|---|
| `rwa-identity` `/api/health` | ✅ `{"status":"ok","chainId":31337,"database":"ok"}` |
| `rwa-issuer` `/api/health` | ✅ `{"status":"ok","chainId":31337,"database":"ok"}` |
| `rwa-token` `/api/health` | ✅ `{"status":"ok","chainId":31337,"database":"ok"}` |
| Página raíz de las 3 apps | ✅ HTTP 200 |
| `GET /api/tokens` (lectura real a PostgreSQL) | ✅ HTTP 200, `{"success":true,"data":[],"count":0}` |
| Anvil global | ✅ chainId `0x7a69`; `IdentityRegistry`, `Token` y `TokenCloneFactory` con código en el bloque 558 |
| Esquema `rwa` en Cloud SQL | ✅ 13 tablas, migraciones `1.0`, `1.1`, `1.2` |
| Cloud Run Job `rwa-indexer` | ✅ ejecuciones `rwa-indexer-ldjgf`, `-gjxsw`, `-szxbb` finalizadas con éxito |
| Scheduler | ✅ `lastAttemptTime 18:07:09` → ejecución `rwa-indexer-szxbb` (`18:07:12 → 18:07:57`) |
| Persistencia del indexer | ✅ **235 eventos / 162 txs** en `rwa.chain_events`; `rwa.indexer_state.last_block = 558` |

## 5. Operación

```bash
# Logs de un servicio
gcloud run services logs read rwa-identity --project mcc-ecommerce --region europe-west1 --limit 50

# Forzar una pasada del indexer
gcloud scheduler jobs run rwa-indexer-schedule --project mcc-ecommerce --location europe-west1

# Ejecutar el job manualmente y esperar
gcloud run jobs execute rwa-indexer --project mcc-ecommerce --region europe-west1 --wait

# Nuevo despliegue (rolling) de una app
TAG=<tag> ./scripts/deploy_gcp.sh deploy
```

## 6. Seguridad y límites conocidos

- **No hay secretos en el repositorio ni en texto plano**: Cloud Run los inyecta desde Secret
  Manager en runtime; la copia en `mcc-ecommerce` es una referencia operativa (canónico:
  `truekeate-main`).
- **Cloud SQL** se alcanza por socket (`/cloudsql/…`) con el SA de runtime y `roles/cloudsql.client`
  concedido **a nivel del proyecto `truekeate-main`** (acceso cross-project imprescindible porque
  la instancia vive allí).
- **Anvil global es un nodo de desarrollo**: su estado puede reiniciarse (los contratos canónicos se
  verificaron presentes el 2026-10-29, bloque 558). El proyecto sigue **sin auditoría externa** y no
  es apto para activos reales (`rwa-sc/SECURITY.md`).
- El escalado es conservador (`max-instances 3`, `min-instances 0`, `PG_POOL_MAX=5`) para no agotar
  las ~25 conexiones de la instancia de desarrollo.
- Pendiente fuera de este despliegue: canal de alertas del indexer (RNF-402/404), archivado a 12
  meses (RNF-403), auditoría externa (R-9/D-024) y dominio personalizado para las apps.

## 7. Evidencia relacionada

- Servicios GCP y su verificación previa: [`pruebas/verificacion_gcp_o0.md`](pruebas/verificacion_gcp_o0.md).
- Indexer (diseño y drill): [`pruebas/h12_indexer.md`](pruebas/h12_indexer.md) y
  [`../apps/indexer/README.md`](../apps/indexer/README.md).
- Conexión Cloud SQL (D-101): [`../scripts/gcp-env.sh`](../scripts/gcp-env.sh).
- Regla de secretos y entornos globales: `rwa-sc/RepoTecnico/entornos_globales.md`.
