# Informe de cierre — etapa `@web` (optimización del frontend RWA)

> **Fecha:** 2026-10-19 · **Línea:** `rwa-web` · **Versión del estado:** v2.7
> **Base:** `INFORME_OPTIMIZACION_WEB_V1.md` (16 hallazgos) · `requerimientos_web.md` v1.2 ·
> `plan_desarrollo_web.md` (ciclos O0…O5) · evidencia en `RepoTecnico/pruebas/`.

## 1. Resultado

La etapa pasa de **5 directorios de app duplicados con MongoDB, `ethers` y `window.ethereum`**
a un **monorepo de 3 apps + 3 paquetes** sobre PostgreSQL, `wagmi`+`viem` y un pipeline único de
calidad. Los ciclos **O0, O1, O3 y O4 están cerrados**; **O5 está prácticamente cerrado** salvo la
validación en infraestructura real (Docker/PostgreSQL) y **O2.7** está bloqueado por el
redespliegue del stack canónico en GCP (fuera de D-088).

## 2. Antes / después medido

| Métrica | Antes | Después | Evidencia |
|---|---|---|---|
| Apps / paquetes | 5 apps duplicadas (`web-*`) | **3 apps + 3 paquetes** (`shared`, `ui`, `config`) | O4.1–O4.3 |
| `window.ethereum` | 82 usos | **0** | O4.6, gate de literales |
| `ethers` | 12 ficheros | **0** (desinstalado de las 3 apps) | O4.6h |
| Datos off-chain | MongoDB (×3 drivers) | **PostgreSQL** (esquema `rwa`, pool único) | O0.2–O0.4 |
| Datos de cliente | fetch + estado manual | **TanStack Query** con invalidación | O4.7 |
| ABIs/direcciones | copias inline divergentes | **generadas desde `rwa-sc`** + gate de deriva | O2.1/O2.2 |
| Sesión | sin sesión | **SIWE + cookie HMAC** y autorización por propiedad | O1 |
| Documentos KYC | GridFS sin cifrar | **bytea cifrado AES-256-GCM** + `audit_log` | O5.4 |
| Tests | 0 | **42 tests** (cobertura crítica 97.16 % líneas) | O3.6/Fase 4 |
| Accesibilidad | sin medir | **axe WCAG A/AA**: 0 críticas/graves en 7 rutas | O5.6 |
| Rendimiento | sin medir | **First Load JS ≤ 367.6 KB gzip** (presupuesto 400 KB) | O5.7 |
| Ergonomía | 3 `npm install`, 3 `npm run dev` | `pnpm install` + `./start-all.sh` / `docker compose` | O5.1/O5.3/O5.8 |

Gate reproducible: `./scripts/ci_local.sh` → **exit 0** (7 pasos: literales · deriva · tsc ·
lint · build ×3 · axe/perf · 42 tests con cobertura).

## 3. Requisitos y criterios

- **RF-W / RNF-W / RT-W**: implementados y trazados en `estado_proyecto.md`; los criterios
  B-1…B-6 / C-1…C-5 se auditan en [`pruebas/fase4_verificacion.md`](pruebas/fase4_verificacion.md)
  (10/10 cumplidos o con validación externalizada explícita).
- **RT-W-02**: stack web3 único `wagmi`+`viem`, 0 `ethers`, 0 `window.ethereum`.
- **RT-W-04**: datos de cliente con TanStack Query.
- **RNF-W-02**: cifrado KYC en reposo y trazas de auditoría.
- **RNF-W-05/06**: accesibilidad AA y presupuesto de rendimiento medidos en CI.

## 4. Pendiente (no bloqueante del código)

| # | Pendiente | Responsable / condición |
|---|---|---|
| 1 | **O2.7** E2E contra Anvil de GCP (build anterior a D-083) | redesplegar desde `@sc` y relanzar `test_e2e_o2.sh` |
| 2 | **O5.1/O5.2** `docker compose up` + build de imágenes | host con Docker (el entorno de desarrollo no lo tiene) |
| 3 | **O5.5** ejecutar retención/backup | PostgreSQL/`psql` real (Cloud SQL o compose) |
| 4 | **O5.6** auditoría de navegador (foco/estados/lectores) | herramienta de browser; la estática axe ya está en CI |
| 5 | **R-9** revisión independiente | auditoría externa previa a producción |
| 6 | **Fase 5 (manuales)** | omitible por D-087; no se generan manuales en esta etapa |

## 5. Veredicto

**Etapa de desarrollo y verificación cerrada a nivel de código y CI.** El frontend queda
**candidato a producción** a falta de: redespliegue de contratos en GCP, validación del entorno
Docker/PostgreSQL en un host real y la auditoría independiente R-9. Hasta entonces se mantiene la
calificación del informe: **no apto para activos reales sin esas validaciones**.
