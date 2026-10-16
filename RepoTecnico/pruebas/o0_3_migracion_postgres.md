# Evidencia O0.3 — Migración de las 3 apps de MongoDB a PostgreSQL (2026-10-14)

> **Tarea:** O0.3 (ciclo O0) — sustituir todo acceso a MongoDB por la capa `@rwa/shared`.
> **Requisitos:** RF-W-14, RT-W-07 · **Decisiones:** D-095 (PostgreSQL), D-098/D-099.
> **Alcance:** 16 rutas / 19 manejadores + el flujo de subida de documentos.

## 1. Qué cambió

### 1.1 Paquete compartido (`packages/shared`)
| Cambio | Motivo |
|---|---|
| `src/api/http.ts` | `toErrorResponse` (AppError → 400/404/409/503) y `ok`; evita repetir el mapeo en 19 manejadores y nunca filtra `error.message` de librería (RF-W-13) |
| `src/config/deployment.ts` | `loadDeployment()` / `getContractAddress()`: direcciones desde `sc/deployments/*.json`, resueltas contra la raíz del workspace (RF-W-09) |
| `TokensRepository.listWithRelations` / `findWithRelationsById` | relaciones `requiredClaims` + `complianceModules` en 3 consultas (elimina el N+1) |
| `DocumentFilesRepository.listByClaimRequestIds` | documentos de varios claims en una consulta para los listados |
| Imports internos sin extensión (`./pool` en vez de `./pool.js`) | Turbopack no resuelve `.js`→`.ts`; con `moduleResolution: Bundler` el import sin extensión compila, tipa y ejecuta con `tsx` |

### 1.2 Apps (monorepo mínimo)
- `@rwa/shared: workspace:*` en las 3 apps; `mongodb` retirado de los 3 `package.json`.
- `transpilePackages: ["@rwa/shared"]` y `serverExternalPackages: ["pg"]` en los 3 `next.config.ts`.
- **Eliminados** los 3 `lib/mongodb.ts` (3 copias byte-idénticas, HW-09).
- Reescritas **16 rutas / 19 manejadores** con `repos`, serializadores y errores tipados; todas con `export const dynamic = 'force-dynamic'` y `runtime = 'nodejs'` (evita ejecutar la BD en el build).
- `web-identity/components/ClaimRequestForm.tsx`: nuevo orden **firmar → crear solicitud → subir documento** (`POST /api/upload` recibe `claimRequestId`); el documento se liga por FK a `rwa.document_files.claim_request_id`.

## 2. Gate reproducible

```bash
# 1) Cero acceso a MongoDB en el código de las 3 apps
grep -rn "mongodb\|MONGODB\|GridFS\|getDatabase" --include='*.ts' --include='*.tsx' \
  web-identity web-registry-trusted web-token | grep -v node_modules | grep -v docker-build
```
**Resultado real:** 1 única coincidencia y es un **comentario** en `web-registry-trusted/app/api/download/[fileId]/route.ts:4`
(*"sustituye GridFS"*). `ls web-*/lib/mongodb.ts` → **ninguno**.

```bash
for d in web-identity web-registry-trusted web-token; do (cd $d && npx tsc --noEmit); done
```
**Resultado real:** `web-identity` **0 errores**. Se mantienen **exactamente** los errores preexistentes del baseline, ninguno en los ficheros migrados:
- `web-registry-trusted`: `app/dashboard/page.tsx(235,44)`, `app/page-new-design.tsx(199,55)`, `app/page-new-design.tsx(250,44)` (ethers/Eip1193Provider) — se saldan en O3.4.
- `web-token`: `app/marketplace/page.tsx(385,31)`, `app/marketplace/page.tsx(549,41)` — ídem.

```bash
for d in web-identity web-registry-trusted web-token; do (cd $d && npx next build); done
```
**Resultado real: los 3 builds terminan con exit 0** y las 16 rutas se emiten como **ƒ (Dynamic)**:

| App | Rutas API dinámicas |
|---|---|
| web-identity | claim-requests · download/[fileId] · issuers/batch · test-gridfs · upload |
| web-registry-trusted | download/[fileId] · issuer-requests · issuers · issuers/batch · update-request |
| web-token | test-db · tokens · tokens/[tokenId]/{claims,compliance,modules,price} |

## 3. Decisiones y deuda declarada

| Punto | Decisión en O0.3 | Cierre previsto |
|---|---|---|
| Cifrado de documentos | `encryption_algo = 'none'` explícito al persistir; el contenido va en claro en `bytea` | **O5.4** (AES-256-GCM, D-093/D-098) |
| `reviewed_by` | Se usa `body.reviewedBy` si es válido; si no, el `issuer_address` de la solicitud | **O1.2** (derivar de la firma EIP-712) |
| Registries del token | Si el cuerpo no los trae, se toman del **artefacto de despliegue** (`getContractAddress`) con comentario *fallback provisional* | **O2.4** (la UI debe enviarlos; RF-W-11) |
| Autorización/PII | Se conserva el comportamiento heredado (descarga `inline`, sin auth) | **O1** (RF-W-02/05/06) |
| ObjectId → uuid | UUID v4 validado con `UUID_RE`; los serializadores mantienen `_id` para no romper la UI | O1/O4 revisan el contrato |
| MIME | Allowlist alineada con el CHECK del esquema y `image/jpg` normalizado a `image/jpeg` | Validación por *magic bytes* en **O1.4** |
| `status` inválido en GET | `ValidationError` (400) en vez de ignorarlo | — |

*Fin de la evidencia — O0.3*
