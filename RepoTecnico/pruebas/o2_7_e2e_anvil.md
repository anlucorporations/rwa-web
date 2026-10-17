# Evidencia O2.7 — E2E del flujo completo (2026-10-17)

> **Tarea:** O2.7 del plan §O2 — prueba de integración del flujo completo contra un Anvil.
> **Resultado:** ✅ **E2E en verde contra un Anvil con el build FINAL de los contratos.**
> ⛔ **El Anvil de GCP sigue ejecutando un build anterior a D-083**; alinearlo exige redesplegar
> el stack canónico desde `@sc` (fuera del alcance D-088 de `@web`, pendiente de autorización).

## 1. E2E implementado (`scripts/test_e2e_o2.sh`)

Flujo completo, sin mocks, con sesiones SIWE reales y firmas reales:

| Paso | Acción | Resultado |
|---|---|---|
| setup | Identidad del inversor (`createIdentity` + `registerIdentity`, admin) y `addTrustedIssuer(issuer,[1])`, idempotente | ✅ |
| 0 | Diagnóstico: `CLAIM_TYPEHASH` on-chain debe incluir `uriHash` (D-083) | ✅ |
| 1 | El inversor crea la solicitud vía API con sesión SIWE | ✅ |
| 2 | El emisor firma el claim **EIP-712** (nonce leído on-chain) y la API valida la firma | ✅ `HTTP 200` |
| 3 | El inversor envía **`addClaim` (7 args)** con esa firma | ✅ confirmado on-chain |
| 4 | `hasValidClaim(topic, issuer)` y `token.isVerified(inversor)` | ✅ `true` / `true` |

## 2. Verificación contra el build final (Anvil local temporal)

Para demostrar que el código `@web` es correcto con los contratos finales sin tocar `rwa-sc`, se
desplegó el build actual en un Anvil efímero usando una **copia temporal** del proyecto Foundry:

```bash
cp -r rwa-sc/sc /tmp/o2-sc
anvil --port 8546 &
cd /tmp/o2-sc
DEPLOYMENT_JSON=deployments/31337-o2local.json \
  forge script script/DeployFullStack.s.sol:DeployFullStack \
  --rpc-url http://127.0.0.1:8546 --broadcast --private-key <admin-anvil>
# El artefacto producido declara CLAIM_TYPEHASH = 0x65c6… (uriHash incluido)

cd rwa-web
O2_RPC_URL=http://127.0.0.1:8546 \
O2_ARTIFACT=/tmp/o2-sc/deployments/31337-o2local.json \
  ./scripts/test_e2e_o2.sh
```

**Salida real (exit 0):**
```
[setup] ✓ identidad creada y registrada: 0xB1eDe3F5AC8654124Cb5124aDf0Fd3885CbDD1F7
        ✓ issuer autorizado para el topic 1
[0]     ✓ CLAIM_TYPEHASH on-chain alineado con el código (uriHash incluido)
[1]     ✓ solicitud: b155e5b4-044c-48c2-b30b-c5ef92fb63e3
[2]     ✓ POST /api/update-request (EIP-712) → HTTP 200
[3]     ✓ addClaim confirmado on-chain
[4]     ✓ identidad.hasValidClaim(1, issuer) → true
        ✓ token.isVerified(inversor) → true
[test-e2e-o2] ✓ E2E COMPLETO EN VERDE
```

`rwa-sc` quedó **intacto** (`git status` limpio) y el Anvil temporal se detuvo al terminar.

## 3. Bloqueo restante: el Anvil de GCP está desactualizado

```
CLAIM_TYPEHASH esperado (código actual, 7 campos con uriHash)
  0x65c6cda5a06929bfdef28339b542f297fa9c29c42c29dea189fd85441d8301fc
CLAIM_TYPEHASH on-chain en el Anvil de GCP (desplegado)
  0x8f719673d99f0733a2d1b85addf49c9a7b0dd6360023e749aa7c0494375a6ead
```
`0x8f71…` es `keccak256("Claim(address walletOwner,uint256 topic,uint256 scheme,bytes32 dataHash,uint256 expiresAt,uint256 nonce)")`
— build **post-Ciclo 8c (nonce) y pre-AF-03 (uriHash)**. El artefacto versionado
`31337-20261010T162639Z.json` (bloque 524) es el único de `rwa-sc` y corresponde a ese build.
Sobre él, `addClaim` revierte `"Signature signer mismatch"`; el script lo detecta como precondición (exit 2).

## 4. Acción necesaria (fuera de D-088)

Redesplegar el stack canónico desde `@sc` y resincronizar:

```bash
cd /home/dsh/workspace/RWA/rwa-sc && sc/script/deploy.sh   # build final → nuevo deployments/*.json
cd ../rwa-web && ./scripts/sync-contracts.sh && ./scripts/test_e2e_o2.sh
```

El E2E ya toma el artefacto más reciente y quedará en verde sin cambios de código.

*Fin de la evidencia — O2.7*
