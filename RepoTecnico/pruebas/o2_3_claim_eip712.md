# Evidencia O2.3 — Claim firmado con EIP-712 y `addClaim` de 7 argumentos (2026-10-14)

> **Tarea:** O2.3 del plan §O2 — flujo `addClaim` alineado con `IdentityCloneable` (RF-W-10, D-020/D-083).
> **Causa raíz corregida:** el emisor firmaba un **mensaje plano EIP-191** y el inversor reenviaba esos
> bytes como `_signature` de `addClaim` → `"Signature signer mismatch"` inevitable.

## 1. Especificación implementada (contrato real)

| Pieza | Valor |
|---|---|
| Dominio EIP-712 | `{ name: 'RWA-Identity', version: '1', chainId: 31337, verifyingContract: <clon de identidad> }` |
| Tipo firmado | `Claim(address walletOwner, uint256 topic, uint256 scheme, bytes32 dataHash, uint256 expiresAt, uint256 nonce, bytes32 uriHash)` |
| `dataHash` | `keccak256(_data)` |
| `uriHash` | `keccak256(bytes(_uri))` (D-083) |
| `nonce` | `claimNonce(topic, issuer)` leído **justo antes** de firmar |
| `expiresAt` | Unix seconds (`0` = perpetuo, D-038) |
| `addClaim` | `(topic, scheme=1, issuer, signature, data, uri, expiresAt)` — **7 args**, selector `0x16cd5ffe` |

## 2. Qué cambió

### 2.1 Paquete compartido
- **`@rwa/shared/claims`** (`src/claims/eip712.ts`, client-safe con `viem`): `buildClaimTypedData`,
  `recoverClaimIssuer`, `claimDataHash`, `claimUriHash`, `assertClaimPayloadConsistent`, `ClaimPayload`.
- **Esquema PostgreSQL v1.1**: `rwa.claim_requests` gana `identity_address`, `claim_chain_id`,
  `claim_scheme` (default 1), `claim_wallet_owner`, `claim_nonce`, `claim_expires_at`, `claim_data`,
  `claim_uri`, `claim_uri_hash`, `claim_data_hash`, `claim_signature` y el CHECK
  `claim_requests_claim_payload_consistency` (completo **al aprobar**).
  - Migración **idempotente** (sección 4.1 del DDL + `schema_migrations` → `1.1`), aplicada en Cloud SQL.
- **Repositorio**: `ReviewClaimRequestInput` acepta `claim` (payload firmado) al aprobar; persiste todas
  las columnas y mantiene la compatibilidad HW-01 (`issuer_signature` = firma EIP-712, `issuer_signed_message` = JSON).
- **Serializador**: el DTO expone `claimPayload` + `claimSignature` para que el inversor pueda firmar/envíe `addClaim`.

### 2.2 Panel de emisor (`web-registry-trusted`)
- Al **aprobar**, `RequestDetailModal` construye el payload con datos on-chain:
  `IdentityRegistry.getIdentity(requester)` (clon), `owner()`, `claimNonce(topic, issuer)`, `expiresAt` (+365 días),
  `data` (JSON de la revisión) y `uri` (enlace al documento). Firma con **`signTypedData`** y envía
  `claim` + `claimSignature` a `POST /api/update-request`.
- La API valida: chainId canónico, `walletOwner == requester`, `topic == claim_topic_id`, `scheme == 1`,
  y **recupera el firmante EIP-712**, que debe ser la sesión del emisor → `reviewed_by` se deriva de ahí.
- El **rechazo** sigue usando la firma EIP-191 del mensaje de revisión (no hay claim on-chain).

### 2.3 Inversor (`web-identity`)
- `RequestDetailModal` ya no construye bytes con ABI viejo ni usa `issuerSignature` EIP-191: lee
  `claimPayload`/`claimSignature` del DTO, comprueba que el `identityAddress` firmado coincide con su
  identidad on-chain y llama a **`addClaim` con 7 argumentos** (`IdentityCloneableAbi` de `@rwa/shared/contracts`).
- `lib/identity-claims.ts`: ABI inline (6 args) eliminado → ABI generado; la copia inline de
  `IdentityCloneable` desaparece (avance de O2.2).

## 3. Gate reproducible

```bash
# 1) Esquema: migración aplicada e idempotente
psql "$CONN" -f rwa-sc/RepoTecnico/base_datos.sql   # exit 0 (2ª ejecución también)
psql "$CONN" -Atc "SELECT version FROM rwa.schema_migrations"   # → 1.0, 1.1
# 2) Artefactos de datos sincronizados (canónico rwa-sc + espejo rwa-web)
bash RepoTecnico/check_sincronizacion_datos.sh --check           # → 3/3 idénticos
# 3) Tipos y builds
(cd web-identity && npx tsc --noEmit)              # 0 errores
(cd web-registry-trusted && npx tsc --noEmit)      # 3 preexistentes
(cd web-token && npx tsc --noEmit)                 # 2 preexistentes
for d in web-identity web-registry-trusted web-token; do (cd $d && npx next build); done   # exit 0 × 3
# 4) E2E de revisión con firma EIP-712 real (cast) y autorización
./scripts/test_review_o1.sh                        # 5/5 en verde
./scripts/test_auth_o1.sh                          # 30/30 en verde (sin regresión)
```

**Salida real — `test_review_o1.sh`:**
```
1) solicitud creada
2) tercero → 403
3) emisor con firma de otra wallet → 403
4) emisor destinatario con su firma EIP-712 → 200, status = approved · claimSignature persistida
5) segunda revisión → 409
```

## 4. Deuda declarada

| Punto | Cierre previsto |
|---|---|
| El E2E de revisión usa un `identityAddress` de prueba (no consulta la cadena); la firma es real pero el `addClaim` on-chain no se ejecuta en ese test | **O2.7** (E2E contra Anvil de GCP) |
| Crear identidad on-chain exige ser `owner`/`authorizedCreator` de la factory (H-07); el inversor no puede auto-crearla desde la UI todavía | O2.7 / decisión de gobernanza |
| Cifrado de documentos | O5.4 |

*Fin de la evidencia — O2.3*
