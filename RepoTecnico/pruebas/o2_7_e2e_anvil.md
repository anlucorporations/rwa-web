# Evidencia O2.7 — E2E contra el Anvil de GCP (2026-10-14)

> **Tarea:** O2.7 del plan §O2 — prueba de integración del flujo completo contra el Anvil de GCP.
> **Estado: ⛔ BLOQUEADO por una dependencia externa al alcance `@web`: el despliegue canónico está desactualizado.**
> **Resto de O2 (2.1·2.2·2.3·2.4·2.5·2.6): ✅ completado.**

## 1. E2E implementado (`scripts/test_e2e_o2.sh`)

Flujo completo, sin mocks:

| Paso | Acción | Resultado |
|---|---|---|
| setup | Identidad del inversor (`createIdentity` + `registerIdentity`, admin) y `addTrustedIssuer(issuer, [1])`; idempotente | ✅ |
| 1 | El inversor crea la solicitud vía API con sesión SIWE | ✅ |
| 2 | El emisor firma el claim **EIP-712** (nonce leído on-chain) y la API lo valida | ✅ `HTTP 200` |
| 3 | El inversor envía `addClaim` (7 args) con esa firma | ❌ `Signature signer mismatch` |
| 4 | `hasValidClaim(topic, issuer)` y `token.isVerified(inversor)` | ❌ (consecuencia del paso 3) |

## 2. Causa raíz: el Anvil de GCP ejecuta un build **anterior a D-083**

El contrato desplegado calcula el digest **sin `uriHash`**; el código actual de `rwa-sc` (y por tanto
`@rwa/shared/claims`) lo incluye (AF-03/D-083). Prueba directa con `cast`:

```
CLAIM_TYPEHASH esperado (código actual, 7 campos con uriHash)
  0x65c6cda5a06929bfdef28339b542f297fa9c29c42c29dea189fd85441d8301fc
CLAIM_TYPEHASH on-chain (desplegado)
  0x8f719673d99f0733a2d1b85addf49c9a7b0dd6360023e749aa7c0494375a6ead
```

`0x8f719673…` es exactamente `keccak256("Claim(address walletOwner,uint256 topic,uint256 scheme,bytes32 dataHash,uint256 expiresAt,uint256 nonce)")`
— es decir, el build **post-Ciclo 8c (nonce) y pre-AF-03 (uriHash)**. Se verificó también que el
`addClaim` desplegado sí tiene 7 argumentos (el revert es de firma, no de selector).

El artefacto versionado `rwa-sc/sc/deployments/31337-20261010T162639Z.json` (bloque 524) es el único
existente y corresponde a ese build. La verificación O0 comprobó `CLAIM_TYPEHASH != 0`, pero **no su valor**,
por eso no se detectó antes.

## 3. Impacto

- El **código `@web` está alineado con la fuente de verdad** (`rwa-sc/sc/abis`, ya regenerados): ABIs,
  EIP-712, `addClaim` 7 args, `isVerified` fail-closed. El E2E off-chain (API + firma EIP-712 + persistencia)
  está en verde.
- El **destino on-chain de la etapa** (Anvil de GCP) no ejecuta los contratos finales, así que ningún
  flujo on-chain puede validarse contra él. Afecta a O2.7 y a la verificación de O2 en producción.
- `scripts/test_e2e_o2.sh` incorpora el diagnóstico como **precondición**: falla en <2 s con el mensaje
  exacto (exit 2) mientras el despliegue no esté alineado, y quedará en verde en cuanto se redespliegue.

## 4. Acción necesaria (fuera del alcance D-088 de `@web`)

Redesplegar el stack canónico desde la línea `@sc` con los contratos finales:

```bash
cd /home/dsh/workspace/RWA/rwa-sc
# deploy.sh lee RPC_URL/CHAIN_ID/clave solo de entorno (Ciclo 9) y verifica la red antes del broadcast
sc/script/deploy.sh            # genera un nuevo sc/deployments/<chainId>-<timestamp>.json
```

Después, en `@web`:
```bash
./scripts/sync-contracts.sh          # toma el artefacto más reciente y regenera direcciones/ABIs
# actualizar NEXT_PUBLIC_DEPLOYMENT_JSON en .env.example/.env.local si cambia el nombre del artefacto
./scripts/test_e2e_o2.sh             # debe pasar los 6 pasos
```

*Fin de la evidencia — O2.7 (bloqueado por despliegue desactualizado)*
