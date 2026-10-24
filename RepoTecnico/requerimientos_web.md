# Requerimientos — Etapa de Optimización del Frontend (`@web`)

> **Línea de desarrollo:** `@web` — este documento vive en `rwa-web/RepoTecnico/` (reorganización de las dos líneas, 2026-10-14).
> Los artefactos de datos compartidos (`base_datos.sql`, `diccionario_datos.md`, `diagrama_er.md`) existen en las dos líneas
> (canónico en `rwa-sc/RepoTecnico/` + espejo en `rwa-web/RepoTecnico/`, sincronizados byte a byte). La documentación de la
> línea `@sc` permanece en `rwa-sc/RepoTecnico/`.
>
> **Proyecto:** RWA (security token inspirado en ERC-3643 / T-REX) · **Área:** `rwa-web/`
> **Etapa:** Optimización del frontend · **Versión:** v1.3 · **Fecha:** 2026-10-24
> **Insumo auditado:** `INFORME_OPTIMIZACION_WEB_V1.md` (16 hallazgos: 3 críticos, 5 altos, 6 medios, 2 bajos; verificación adversarial 15/15 confirmados)
> **Alcance aprobado:** D-088 = solo frontend. Los contratos quedan cerrados (394/394 en verde, cobertura `src/` 97,05 %).
>
> **Changelog v1.3 (2026-10-24):** (a) registradas **D-102** (separación de líneas `@sc`/`@web`),
> **D-103** (cabeceras de seguridad y límites de subida), **D-104** (presupuesto de rendimiento 400 KB gzip)
> y **D-105** (registro de identidades `onlyOwner` como limitación conocida); (b) RF-W-17/RNF-W-04/RNF-W-06
> actualizados a PostgreSQL y al presupuesto de 400 KB; (c) alineación de versión con `estado_proyecto.md` v3.1.
>
> **Changelog v1.2 (2026-10-14):** (a) **reubicación** del documento a `rwa-web/RepoTecnico/` al separar las líneas
> `@sc`/`@web` (los artefactos de datos mantienen canónico en `rwa-sc` + espejo aquí, con gate de sincronización);
> (b) **D-101** registrada (conexión a Cloud SQL: socket canónico / TCP en host autorizado); (c) **O0.1 ejecutado**:
> esquema `rwa` aplicado en Cloud SQL `truekeate-db-dev` — 10 tablas + 1 vista + 29 índices + catálogo de 5 topics.
>
> **Changelog v1.1 (2026-10-14):** **decisión del usuario:** la BD off-chain del frontend es **PostgreSQL**
> (Cloud SQL, PG 15+) — no MongoDB — y la red on-chain canónica es el **Anvil de GCP (chain 31337)**.
> Añadidas **D-095** y **D-096**; §5, §6, RF-W-05/06, RNF-W-02 y RT-W-07/08 reescritos en consecuencia.
> Sincronizado en el mismo turno con `base_datos.sql` v1.0, `diccionario_datos.md` v1.2 y `diagrama_er.md` v1.2.

---

## 1. Alcance y objetivo

Optimizar `rwa-web/` hasta que sea **apto para un entorno real de uso interno** y **coherente con los contratos actuales**, sin rediseñar el producto ni reabrir el ciclo de contratos.

**Situación de partida (medida):** 5 apps Next.js · 16.648 líneas · 16 rutas de API (**0 con autenticación**) · 0 tests · 0 CI · sin control de versiones · 4 versiones distintas de `next` · 2 stacks web3 · flujo de claims roto por deriva de ABI.

**Objetivo de salida:** 3 apps (inversor / emisor / token) sobre monorepo pnpm con paquete compartido, con CI en verde, flujo end-to-end operativo en la red canónica y 0 endpoints que expongan PII.

### Decisiones que gobiernan esta etapa

| ID | Decisión aprobada |
|---|---|
| **D-088** | Alcance = solo frontend `@web`; contratos cerrados |
| **D-089** | Estrategia = hardening + monorepo y consolidación (ciclos O1–O5) |
| **D-090** | Orden = O1 seguridad → O2 integración → O3 higiene → O4 consolidación → O5 operación/calidad |
| **D-091** | Red canónica de desarrollo = **Anvil 31337**, con red parametrizable para Besu · **matizado por D-096: la instancia canónica es el Anvil de GCP** |
| **D-092** | Sesión = **SIWE (EIP-4361) + cookie httpOnly firmada**; rol por wallet |
| **D-093** | Custodia KYC = **documentos cifrados + acceso por propiedad** · **matizado por D-095: el almacén es PostgreSQL (`document_files`), no GridFS** |
| **D-094** | Se crea el repositorio `rwa-web` y se publica en GitLab.com (sin `push` sin orden explícita) |
| **D-095** | **BD off-chain = PostgreSQL** (Cloud SQL, PG 15+), esquema `rwa`. Supersede MongoDB (D-002) para el frontend y resuelve Q6. Esquema real en `base_datos.sql` v1.0 |
| **D-096** | **Red on-chain canónica del frontend = Anvil de GCP** (`MCC_ANVIL_RPC_URL`, chain 31337); Besu 81234 queda como alternativa documentada |
| **D-097** | **Hosting de la BD = Cloud SQL `truekeate-db-dev`** (PG 15.18, Auth Proxy `127.0.0.1:5433`) |
| **D-098** | **Documentos KYC = `bytea` cifrado AES-256-GCM en `rwa.document_files`** (sin almacenamiento externo) |
| **D-099** | **Arranque limpio:** sin ETL desde MongoDB; esquema vacío + catálogo de topics sembrado |
| **D-100** | **Se añade el ciclo O0 (fundación) como primer ciclo**, antes de O1 |
| **D-101** | **Conexión a Cloud SQL:** socket unix canónico (`/cloudsql/truekeate-main:southamerica-east1:truekeate-db-dev`) para Cloud Run/Auth Proxy; TCP a la IP pública `34.39.180.101` en hosts autorizados. Fijado en `rwa-web/scripts/gcp-env.sh` (`--tcp`) |
| **D-102** | **Separación de líneas `@sc`/`@web`:** repositorios y documentación independientes; los tres artefactos de datos se mantienen idénticos byte a byte (canónico en `rwa-sc` + espejo en `rwa-web`) |
| **D-103** | **Seguridad de respuestas y límites de subida (2026-10-23):** cabeceras `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy` y `Strict-Transport-Security` en las 3 apps (verificadas por `scripts/headers_o5.mjs`) y límites de subida por tamaño/tasa/cuota por wallet (`UPLOAD_MAX_MB`, `UPLOAD_MAX_PER_HOUR`, `UPLOAD_QUOTA_MB`) |
| **D-104** | **Presupuesto de rendimiento (2026-10-23):** se fija en **400 KB gzip por ruta** (First Load JS). Sustituye el objetivo de 300 KB de RNF-W-06, no alcanzable con el stack actual (Next 16 + wagmi/viem; máximo medido 367,6 KB). Un objetivo de 300 KB exigiría una ronda específica de optimización |
| **D-105** | **Registro de identidades (2026-10-23):** `IdentityRegistry.registerIdentity` es `onlyOwner`; el alta de inversores queda como operación del admin (wallet owner) y se documenta como limitación conocida. No se reabre el contrato en el alcance D-088 |

---

## 2. Requerimientos funcionales (RF-W)

| ID | Requerimiento | Trazabilidad |
|---|---|---|
| **RF-W-01** | El sistema deberá autenticar al usuario mediante SIWE (EIP-4361): nonce de un solo uso, `domain`/`uri`/`chainId` validados y emisión de cookie `httpOnly`+`SameSite=Strict`+`Secure` firmada con caducidad. | HW-01, HW-04, D-092 |
| **RF-W-02** | El sistema deberá autorizar cada petición a las 16 rutas según rol (inversor / issuer autorizado / admin de token) y **propiedad del recurso**; ninguna ruta de escritura podrá ejecutarse sin sesión válida. | HW-01, HW-04, B-1 |
| **RF-W-03** | Al aprobar o rechazar un claim, el sistema deberá: verificar la firma del emisor sobre el mensaje revisado, derivar la dirección del emisor **de la firma**, comprobar que está autorizado para ese topic en el `TrustedIssuersRegistry` (o caché verificada), rechazar segundas revisiones y registrar `reviewedBy`+`reviewedAt`. | HW-01, H-01, D-007 |
| **RF-W-04** | Al crear una solicitud de claim, el sistema deberá verificar la firma del solicitante y que la wallet firmante coincida con `requesterAddress`. | HW-04, HW-01 |
| **RF-W-05** | El sistema deberá validar los ficheros subidos por **magic bytes** (no por `file.type`), calcular su `sha256`, cifrarlos (AES-256-GCM) y persistirlos en `rwa.document_files` asociados a la solicitud, con límite de tamaño/tasa/cuota por wallet. | HW-02, D-095 |
| **RF-W-06** | El sistema deberá servir documentos KYC **solo** al titular o a un issuer autorizado, descifrando en servidor desde `rwa.document_files`, con `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff` y registro en `audit_log`. | HW-02, D-095 |
| **RF-W-07** | El sistema deberá retirar del build las rutas de depuración (`/api/test-*`) salvo en entorno local con flag explícito. | HW-02 |
| **RF-W-08** | El sistema deberá leer la red (RPC, `chainId`, direcciones) de una configuración única validada al arranque; si el `chainId` de la wallet no coincide, mostrará un error explícito y bloqueará la operación. | HW-07, D-091 |
| **RF-W-09** | Las ABIs y direcciones deberán proceder de los artefactos versionados de `rwa-sc` (`sc/abis/`, `sc/deployments/*.json`); un gate de CI fallará si hay deriva. | HW-03, HW-07 |
| **RF-W-10** | El flujo de claim deberá funcionar end-to-end contra los contratos actuales: `addClaim(_topic,_scheme,_issuer,_signature,_data,_uri,_expiresAt)` con firma EIP-712 válida, incluida la representación del `uriHash` en el digest (D-083). | HW-03, H-01, D-083 |
| **RF-W-11** | La creación de token exigirá `identityRegistry`, `trustedIssuersRegistry` y `claimTopicsRegistry` no nulos; si falta alguno, la UI bloqueará el envío y explicará el motivo (fail-closed). | HW-03, H-05, D-084 |
| **RF-W-12** | El registro del nombre visible de un emisor solo podrá realizarlo el propio emisor verificado en la cadena o un admin. | HW-02 |
| **RF-W-13** | Las rutas devolverán códigos correctos ante caída de dependencias (`503`) y errores tipados; nunca devolverán `200` con datos vacíos ni `error.message` de librería. | HW-08, B-6 |
| **RF-W-14** | El código deberá quedar consolidado en un monorepo pnpm con un paquete compartido (config de red, ABIs generados, tipos, cliente Mongo, cliente de API, esquemas de validación) consumido por las 3 apps finales. | HW-06, HW-09, D-089 |
| **RF-W-15** | El repositorio `rwa-web` deberá existir con CI que ejecute lint, `tsc --noEmit`, build y tests en cada MR, y publicarse en GitLab.com. | HW-05, D-094 |
| **RF-W-16** | El sistema deberá registrar logs estructurados con `requestId` correlacionado y disponer de `error.tsx`/`loading.tsx` por ruta. | HW-13 |
| **RF-W-17** | Deberá existir un entorno local reproducible con una orden (`docker-compose`: 3 apps + PostgreSQL + nodo Anvil) y un build de producción contenedorizado con healthcheck. | HW-11, HW-12 |
| **RF-W-18** | `web-rwa` y `web-registry-trusted2` deberán absorberse o eliminarse: `web-rwa` queda como portal con enlaces correctos y configurables, o se retira. | HW-10 |

---

## 3. Requerimientos no funcionales (RNF-W)

| ID | Categoría ISO 25010 | Requerimiento y criterio medible |
|---|---|---|
| **RNF-W-01** | Seguridad | **0 rutas sin autenticación** y 0 rutas sin autorización por recurso, verificado por test automatizado que recorre el manifiesto de rutas. Cabeceras `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security` presentes en todas las respuestas. |
| **RNF-W-02** | Seguridad de la información / privacidad | Documentos KYC cifrados en reposo (AES-256-GCM) en `rwa.document_files`, con clave fuera del código; **0** endpoints públicos que devuelvan PII; cada acceso a documento queda en `rwa.audit_log`; política de retención y borrado aplicada. |
| **RNF-W-03** | Mantenibilidad | Una sola versión de `next` y `react` en el workspace; `typescript.ignoreBuildErrors` ausente; `tsc --noEmit` en verde; **0 copias duplicadas** de `lib/mongodb.ts` y `TrustedIssuersRegistry`; 0 ficheros muertos. |
| **RNF-W-04** | Fiabilidad | Ante caída de PostgreSQL o del RPC, la API responde `503` con error tipado en < 2 s; **0** respuestas `200` con colección vacía por error. |
| **RNF-W-05** | Usabilidad / accesibilidad | WCAG 2.1 AA: **0 violaciones críticas** en `axe` sobre las rutas principales; notificaciones y estados de carga/error unificados; navegación por teclado verificada. |
| **RNF-W-06** | Eficiencia de desempeño | Presupuesto verificado en build de producción: **First Load JS ≤ 400 KB gzip por ruta** (D-104); LCP ≤ 2,5 s en entorno local; imágenes con `next/image`. |
| **RNF-W-07** | Portabilidad | Dev/prod seleccionables por variables de entorno; **0** literales `0x…` (40 hex), `localhost:` o `http://` de servicio en el código fuente (verificado por gate). |
| **RNF-W-08** | Verificabilidad | Cobertura de tests ≥ **70 %** de líneas en `packages/shared` y en las rutas de API críticas (claims, tokens, documentos); el flujo claim→aprobación cubierto por 1 test E2E. |

---

## 4. Requerimientos técnicos (RT-W)

| ID | Requerimiento |
|---|---|
| **RT-W-01** | Stack unificado: Next 16 (versión única) + React 19 (versión única) + TypeScript `strict` + Tailwind 4. |
| **RT-W-02** | Stack web3 unificado en **`wagmi` + `viem`**; se eliminan los 96 usos directos de `window.ethereum` y la dependencia `ethers` (o se aísla tras el paquete compartido si un caso lo exige). |
| **RT-W-03** | Validación de entrada con **`zod`** en `packages/shared`, aplicada en todas las rutas de API. |
| **RT-W-04** | Estado de datos en cliente con **TanStack Query**; sin `fetch` disperso en componentes. |
| **RT-W-05** | Monorepo **pnpm workspaces** (`apps/*`, `packages/*`); scripts raíz `dev`, `build`, `lint`, `typecheck`, `test`. |
| **RT-W-06** | CI en GitLab con imagen Node fijada por digest/tag; gates: `lint`, `tsc --noEmit`, `build`, `test`, `check-network-literals`, `check-abi-drift`. |
| **RT-W-07** | **PostgreSQL** (Cloud SQL, PG 15+): acceso con `pg`/`postgres.js` desde `packages/shared` con pool único y consultas parametrizadas; esquema y migraciones desde `base_datos.sql` (espejo local; canónico en `rwa-sc/RepoTecnico/`, esquema `rwa`). |
| **RT-W-08** | Custodia: `KYC_ENCRYPTION_KEY` y `DATABASE_URL` desde Secret Manager/`gcloud` (patrón `DS_*`), nunca en el repositorio; `pgcrypto` habilitado para `gen_random_uuid()`/`digest()`. |
| **RT-W-09** | Contenedores multi-stage con `output: "standalone"`, `PORT` configurable y healthcheck HTTP. |
| **RT-W-10** | Observabilidad: logger estructurado (`pino`) con `requestId`; 0 `console.log` en rutas y componentes de producción. |

---

## 5. Modelo de datos del frontend (PostgreSQL, esquema `rwa`)

> **Fuente de verdad (D-095):** el esquema real y ejecutable de la BD off-chain está en
> **`base_datos.sql` v1.0** y se describe, con los mismos nombres, en `diccionario_datos.md` §2 y
> `diagrama_er.md` §2. **Los tres artefactos van sincronizados en el mismo turno**; esta sección es un
> resumen y nunca prevalece sobre ellos.

| Tabla (esquema `rwa`) | Papel | Claves e integridad |
|---|---|---|
| `claim_topics` | Catálogo canónico de topics (H-13): 1 KYC, 7 Accreditation, 9 Jurisdiction; 5/6 reservados | PK `id` (smallint) · UK `code` |
| `issuers` | Nombre visible del emisor y caché de verificación (RF-W-12) | PK `id` (uuid) · UK `address` |
| `claim_requests` | Solicitud de claim: wallet, emisor, topic, firmas del solicitante y del revisor | PK `id` · FK `claim_topic_id` · **CHECK de consistencia de revisión** (`reviewed_by`+`reviewed_at`+`issuer_signature` obligatorios al resolver) |
| `document_files` | Documentos KYC cifrados AES-256-GCM (sustituye GridFS) | PK `id` · FK `claim_request_id` CASCADE · CHECK tamaño 0<n≤10 MB y allowlist MIME |
| `tokens` | Registro off-chain del token | PK `id` · UK `token_address` · **CHECK `tokens_registries_required`** (los 3 registries NOT NULL; RF-W-11) |
| `token_required_claims` | Topics exigidos por token (normaliza `requiredClaims`) | PK (`token_id`,`claim_topic_id`) |
| `token_compliance_modules` | Módulos de compliance por token (normaliza `complianceModules`) | PK (`token_id`,`module_address`) |
| `sessions` | Sesiones SIWE (RF-W-01, D-092) | PK `id` · UK `nonce` · enum `session_role` |
| `audit_log` | Auditoría de accesos y mutaciones (RNF-W-02) | PK `id` (bigserial) · índices por actor/recurso/`request_id` |
| `schema_migrations` | Control de versiones del esquema | PK `version` |

Índices obligatorios, vista `v_claim_request_summary` y semillas del catálogo: **`base_datos.sql` §6–§8**.
Datos del sistema MongoDB sustituido (para el ETL): **Anexo A de `base_datos.sql`**.

---

## 6. Entornos y variables

Ver `rwa-sc/RepoTecnico/entornos_globales.md` §14. Resumen de variables del frontend:

| Variable | Ámbito | Uso |
|---|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | público | Red canónica · **Anvil de GCP, chain 31337** (D-096) |
| `NEXT_PUBLIC_RPC_URL` | público | RPC del Anvil de GCP (`MCC_ANVIL_RPC_URL`) |
| `NEXT_PUBLIC_DEPLOYMENT_JSON` | público | Artefacto de direcciones (`sc/deployments/…`) |
| `DATABASE_URL` | servidor | **PostgreSQL** (Cloud SQL vía Auth Proxy) — sustituye a `MONGODB_URI` |
| `SIWE_SESSION_SECRET` | servidor | Firma de la cookie de sesión (Secret Manager) |
| `KYC_ENCRYPTION_KEY` | servidor | AES-256-GCM de documentos (Secret Manager) |
| `LOG_LEVEL` | servidor | Nivel de logging estructurado |

---

## 7. Matriz de trazabilidad hallazgo → requerimiento

| Hallazgo (informe WEB V1) | Severidad | Requerimientos que lo cierran |
|---|---|---|
| HW-01 aprobación sin autorización ni firma | Crítica | RF-W-01, RF-W-02, RF-W-03 |
| HW-02 PII y documentos expuestos | Crítica | RF-W-05, RF-W-06, RF-W-07, RF-W-12, RNF-W-01, RNF-W-02 |
| HW-03 deriva de ABI / flujo roto | Crítica | RF-W-09, RF-W-10, RF-W-11 |
| HW-04 escrituras sin autenticar | Alta | RF-W-01, RF-W-02, RF-W-04 |
| HW-05 sin VCS, tests ni CI | Alta | RF-W-14, RF-W-15, RNF-W-08 |
| HW-06 versiones y stacks divergentes | Alta | RF-W-14, RNF-W-03, RT-W-01, RT-W-02 |
| HW-07 entornos y direcciones hardcodeadas | Alta | RF-W-08, RF-W-09, RNF-W-07 |
| HW-08 errores que ocultan fallos | Alta | RF-W-13, RNF-W-04 |
| HW-09 duplicación estructural | Media | RF-W-14, RNF-W-03 |
| HW-10 `web-rwa` desalineada | Media | RF-W-18 |
| HW-11 artefactos de build parciales | Media | RF-W-17, RT-W-09 |
| HW-12 operación frágil | Media | RF-W-17, RT-W-09 |
| HW-13 observabilidad y calidad | Media | RF-W-16, RT-W-10 |
| HW-14 validación solo en cliente | Media | RF-W-05, RF-W-13, RNF-W-01, RT-W-03 |
| HW-15 documentación contradictoria / `env.local` | Baja | RF-W-15, RNF-W-07 |
| HW-16 UX y accesibilidad | Baja | RNF-W-05, RNF-W-06 |

**Cobertura:** 16/16 hallazgos mapeados; 0 huérfanos.

---

## 8. Criterios de aceptación de la etapa

Se adoptan los del informe WEB V1 §8:

- **Bloqueantes B-1…B-6:** autorización real en toda mutación · 0 endpoints públicos con PII · ABIs/direcciones sin deriva y flujo end-to-end operativo · repositorio con CI · una versión de `next`/`react` y sin `ignoreBuildErrors` · 0 errores devueltos como `200`.
- **Calidad C-1…C-5:** `packages/shared` sin duplicados · entorno reproducible y build de producción · 0 `console.log` con logging estructurado · documentación y mapa de apps correctos · RNF web medidos en CI.

---

## 9. Riesgos y supuestos

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | Migrar a SIWE rompe el flujo actual de los usuarios de prueba | Se introduce en O1/O2 con modo de transición documentado y tests E2E antes de retirar el acceso anónimo |
| 2 | Unificar `ethers` → `wagmi`/`viem` toca 96 puntos de uso | Se hace en O4, tras tener CI y tests que cubran el flujo crítico |
| 3 | La app `web-registry-trusted2` (viem) puede ser la base de consolidación | Se decide en O4 comparando cobertura funcional; se preserva hasta entonces |
| 4 | El Anvil de GCP y el despliegue de `sc/deployments` deben seguir vivos | O2 valida `chainId` y existencia de código on-chain antes de dar el flujo por bueno |
| 5 | Sin `node_modules` instalados, el primer build puede revelar errores de tipo ocultos | O3 los salda app por app; `ignoreBuildErrors` se retira la última |

**Supuestos:** los contratos no cambian durante la etapa (D-088); la red canónica sigue siendo Anvil 31337 con el artefacto `sc/deployments/31337-20261010T162639Z.json`; el usuario autorizará explícitamente cualquier `push`.

---

## 10. Preguntas abiertas (bloque 3 de la entrevista)

1. ¿Se mantiene la autenticación anónima de *solo lectura* para el marketplace público de tokens, o todo requiere SIWE?
2. ¿`web-registry-trusted2` se convierte en la base del nuevo panel de emisor (stack `viem`) o se retira?
3. ¿El portal `web-rwa` se mantiene como landing con puertos configurables o se absorbe en `web-identity`?
4. ¿Se usa el Anvil de GCP para el preview de la etapa, o basta el entorno local con `docker-compose`?
5. ¿El remoto de `rwa-web` será `gitlab.com/anlucorporations/rwa-web` (¿mismo grupo que `rwa-sc`)?

---

*Fin del documento — requerimientos_web.md v1.0*
