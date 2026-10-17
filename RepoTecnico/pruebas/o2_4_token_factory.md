# Evidencia O2.4 — Creación de token alineada con la factoría real (2026-10-14)

> **Tarea:** O2.4 del plan §O2 — `claimTopicsRegistry` obligatorio y compliance en el mismo flujo (RF-W-11).
> **Causa raíz corregida:** la UI llamaba a `createTokenWithRegistries` con **8 argumentos** (un
> `maxTotalSupply` inexistente en el contrato) y pasaba `claimTopicsRegistry = 0x0`; el token quedaba
> **no verificable** por diseño (fail-closed de `isVerified`).

## 1. Contrato real (verificado en `rwa-sc/sc/src/TokenCloneFactory.sol`)

```
createTokenWithRegistries(string name, string symbol, uint8 decimals, address admin,
                          address identityRegistry, address trustedIssuersRegistry,
                          address claimTopicsRegistry)   // 7 args
```
- `onlyCreator` (owner de la factoría o `authorizedCreators`, H-07).
- `ClaimTopicsRegistryCloneFactory.createRegistryForTokenWithTopics(owner, token, uint256[] topics)`
  crea el registry del token, añade los topics y transfiere la propiedad al admin.
- `TokenCloneable.setClaimTopicsRegistry(address)`, `setMaxSupply(uint256)`, `addComplianceModule(address)`.

## 2. Qué cambió

### `web-token/components/CreateTokenForm.tsx` (flujo completo reescrito)
1. Valida la red canónica (`assertCanonicalChain`).
2. **Tx 1:** `createTokenWithRegistries(name, symbol, decimals, admin, IdentityRegistry, TrustedIssuersRegistry, 0x0)` — 7 args.
3. **Tx 2:** `createRegistryForTokenWithTopics(admin, token, selectedClaims)` → registry real del token.
4. **Tx 3:** `token.setClaimTopicsRegistry(registry)`.
5. **Tx 4:** `token.setMaxSupply(...)` si se indicó suministro (0 = sin tope, D-022).
6. **Tx 5 (compliance):** `token.addComplianceModule(ComplianceAggregator)` si se marcó la opción.
7. **`POST /api/tokens`** con los **tres registries reales**, `requiredClaims`, `complianceModules` y metadatos.
8. Si el alta off-chain falla, el mensaje distingue «token creado on-chain, no registrado en BD».

Usa exclusivamente los ABIs generados (`TokenCloneFactoryAbi`, `ClaimTopicsRegistryCloneFactoryAbi`,
`TokenCloneableAbi` de `@rwa/shared/contracts`), eliminando otra copia inline (avance O2.2).

### `web-token/app/api/tokens/route.ts` (RF-W-11, fail-closed)
- `identityRegistry`, `trustedIssuersRegistry` y `claimTopicsRegistry` son **obligatorios** y deben ser
  direcciones válidas. Se elimina el *fallback* silencioso al artefacto de despliegue.
- `requiredClaims` debe traer **al menos un topic**: un token que no exige nada no verificaría a nadie.
- Se mantiene `requireSession` + `requireOwner(adminAddress)` + auditoría `token.create`.

## 3. Gate reproducible

```bash
(cd web-token && npx tsc --noEmit)      # 2 errores preexistentes (marketplace), 0 en el flujo
(cd web-token && npx next build)        # exit 0 (108 s)
./scripts/check-network-literals.sh     # 0 literales de red
./scripts/check-contract-drift.sh       # 0 deriva
```

## 3.1 Gate de la API (RF-W-11)

```bash
./scripts/test_token_o2.sh
```
**Resultado real (exit 0):**
```
✓ POST /api/tokens anónimo → 401
✓ POST sin registries (sesión) → 400
✓ POST sin requiredClaims → 400
✓ POST válido (201) → 201
✓ GET /api/tokens incluye el token → 200
[test-token-o2] ✓ gate de token en verde
```
La fila de prueba se elimina al terminar (esquema limpio, D-099).

## 4. Deuda declarada

| Punto | Cierre previsto |
|---|---|
| El aggregator se añade como módulo, pero los **módulos de compliance por token** (MaxBalance/MaxHolders/TransferLock) requieren un despliegue por token que hoy no existe en la web (el deploy script los crea fuera). Mientras no se configure uno, `canTransfer` es fail-closed y las transferencias quedan bloqueadas | O5 / decisión de gobernanza |
| El E2E on-chain del flujo completo (identidad → claim → addClaim → `hasValidClaim`) | **O2.7** |

*Fin de la evidencia — O2.4*
