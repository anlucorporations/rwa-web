# 📚 RepoTecnico — Línea de desarrollo `@web` (rwa-web)

**Proyecto:** RWA (security token inspirado en ERC-3643 / T-REX)
**Área:** `rwa-web/` — documentación técnica propia de la línea de frontend
**Reorganización:** 2026-10-14 — separación de las dos líneas de desarrollo

---

## 🎯 Por qué existe esta carpeta

El proyecto RWA tiene **dos líneas de desarrollo independientes**, cada una con sus propios
archivos:

| Línea | Carpeta | Contenido | Documentación técnica |
|---|---|---|---|
| **`@sc`** — contratos | `rwa-sc/` | Solidity (`sc/src`, `sc/test`, `sc/script`), ABIs, despliegues, CI | `rwa-sc/RepoTecnico/` |
| **`@web`** — frontend | `rwa-web/` | 5 apps Next.js, scripts de arranque y entorno | `rwa-web/RepoTecnico/` (esta carpeta) |

La etapa de **optimización del frontend** (decisiones D-088…D-101) generó documentos propios de
la línea `@web` que estaban archivados dentro de `rwa-sc/RepoTecnico/`. El 2026-10-14 se movieron
aquí para mantener las dos líneas separadas y con sus archivos propios.

---

## 📄 Documentos de la línea `@web`

| Documento | Versión | Contenido |
|---|---|---|
| [INFORME_OPTIMIZACION_WEB_V1.md](INFORME_OPTIMIZACION_WEB_V1.md) | V1 | Auditoría del frontend: 16 hallazgos (3 críticos, 5 altos, 6 medios, 2 bajos), bloqueantes B-1…B-6 y criterios de cierre C-1…C-5 |
| [requerimientos_web.md](requerimientos_web.md) | v1.1 | RF-W-01…18, RNF-W-01…08, RT-W-01…10, modelo PostgreSQL y trazabilidad HW→requisito |
| [plan_desarrollo_web.md](plan_desarrollo_web.md) | v1.1 | Plan vertical de la etapa: ciclos O0…O5 con tareas, gates y definición de terminado |
| [pruebas/verificacion_gcp_o0.md](pruebas/verificacion_gcp_o0.md) | — | Acta de verificación de los servicios GCP (Anvil de GCP + Cloud SQL) del ciclo O0 |

### Decisiones que gobiernan la etapa

D-088 (alcance = solo frontend) · D-089 (hardening + monorepo) · D-090 (orden de ciclos) ·
D-091/D-096 (red canónica = Anvil de GCP, chain 31337) · D-092 (SIWE) · D-093/D-095/D-098
(custodia KYC y PostgreSQL) · D-094 (repositorio `rwa-web`) · D-097 (Cloud SQL `truekeate-db-dev`) ·
D-099 (arranque limpio) · D-100 (ciclo O0) · D-101 (conexión Cloud SQL).

---

## 🔗 Artefactos de datos compartidos (canónico en `rwa-sc/` + espejo en `rwa-web/`)

Los siguientes artefactos son **de proyecto** (cubren el modelo on-chain de los contratos y el
off-chain del frontend) y, por decisión del usuario, existen **en las dos líneas con el mismo
contenido**: el **canónico** en `rwa-sc/RepoTecnico/` y un **espejo** aquí en `rwa-web/RepoTecnico/`.

| Artefacto | Canónico (línea `@sc`) | Espejo (línea `@web`) |
|---|---|---|
| `base_datos.sql` | `rwa-sc/RepoTecnico/base_datos.sql` | [base_datos.sql](base_datos.sql) — DDL real PostgreSQL del esquema `rwa` |
| `diccionario_datos.md` | `rwa-sc/RepoTecnico/diccionario_datos.md` | [diccionario_datos.md](diccionario_datos.md) — on-chain + off-chain |
| `diagrama_er.md` | `rwa-sc/RepoTecnico/diagrama_er.md` | [diagrama_er.md](diagrama_er.md) — on-chain + off-chain |

> **Regla de sincronización (obligatoria):** los tres artefactos se actualizan **juntos** y los dos
> juegos deben ser **idénticos byte a byte**. Edita el canónico y ejecuta
> [`check_sincronizacion_datos.sh`](check_sincronizacion_datos.sh) `--sync`; verifica con `--check`
> en el mismo turno. Regla completa: [ARTEFACTOS_DATOS_SINCRONIZADOS.md](ARTEFACTOS_DATOS_SINCRONIZADOS.md).

### Documentación de proyecto asociada (permanece en `rwa-sc/RepoTecnico/`)

| Artefacto | Rol |
|---|---|
| `rwa-sc/RepoTecnico/entornos_globales.md` | Rutas, repos, GCP, redes y toolchain (§14 = variables del frontend) |
| `rwa-sc/RepoTecnico/estado_proyecto.md` | Estado global del proyecto y registro de decisiones |

---

## 🔧 Artefactos de entorno (ya en `rwa-web/`)

- [../scripts/gcp-env.sh](../scripts/gcp-env.sh) — exporta y verifica RPC (Anvil de GCP) y `DATABASE_URL` (Cloud SQL).
- [../.env.example](../.env.example) — plantilla sin secretos de las variables de GCP.

---

*Índice de la línea `@web` — 2026-10-14.*
