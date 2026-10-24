# Evidencia O2.7 — E2E del flujo completo (2026-10-17 · cerrado 2026-10-23)

> **Tarea:** O2.7 del plan §O2 — prueba de integración del flujo completo contra el Anvil de GCP.
> **Resultado:** ✅ **E2E en verde contra el Anvil de GCP el 2026-10-23** tras redesplegar el stack
> canónico desde `@sc` (artefacto `31337-20261023T185622Z.json`, `CLAIM_TYPEHASH` con `uriHash`).

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

## 3. Cierre en el Anvil de GCP (2026-10-23)

Con autorización del usuario se redesplegó el stack canónico desde `@sc`:

```bash
cd /home/dsh/workspace/RWA/rwa-sc
source /home/dsh/workspace/gcp-env.sh      # RPC_URL + CHAIN_ID=31337 + ADMIN_PRIVATE_KEY
sc/script/deploy.sh                        # artefacto 31337-20261023T185622Z.json
cd ../rwa-web && ./scripts/sync-contracts.sh
PG_POOL_MAX=2 ./scripts/test_e2e_o2.sh
```

- **Artefacto nuevo:** `rwa-sc/sc/deployments/31337-20261023T185622Z.json` (bloque 549).
- **Direcciones nuevas:** `IdentityRegistry 0xA3f7BF5b…`, `TrustedIssuersRegistry 0x25A1DF48…`,
  `Identity 0x9B2B010a…`, `Token 0x7d5dC037…`.
- **Diagnóstico [0]:** `CLAIM_TYPEHASH = 0x65c6cda5…` (incluye `uriHash`, D-083) — ya coincide.
- **Nota de `deploy.sh`:** con Foundry 1.8.3, `cast call` devuelve los enteros con sufijo humano
  (`1000000000000000000000000 [1e24]`), por lo que la comparación del smoke test falla y el script
  termina con `exit 1` **después** de escribir el artefacto y verificar `cast code` en los 10
  contratos. El despliegue es válido: el E2E completo y las llamadas on-chain lo confirman.
- **Ajuste operativo:** `PG_POOL_MAX=2` en el E2E. Cloud SQL de desarrollo admite ~25 conexiones y
  los dos `next start` con pool por defecto (10) agotaban los slots; el pool por defecto bajó a 5
  (`packages/shared/src/db/pool.ts`) y el E2E fija 2.

**Salida real (exit 0):**

```
[setup] ✓ identidad ya existente: 0x43FaAa331e25df1Be98ACE4364B8c87DB7B3f21B
        ✓ issuer autorizado para el topic 1
[0]     ✓ CLAIM_TYPEHASH on-chain alineado con el código (uriHash incluido)
[1]     ✓ solicitud: 61f5a8eb-42bd-4697-a26c-43dc966cc5dd
[2]     ✓ POST /api/update-request (EIP-712) → 200
[3]     ✓ addClaim confirmado on-chain
[4]     ✓ identidad.hasValidClaim(1, issuer) → true
        ✓ token.isVerified(inversor) → true
[test-e2e-o2] ✓ E2E COMPLETO EN VERDE contra el Anvil de GCP
```

## 4. Reproducir

El script toma siempre el artefacto más reciente de `rwa-sc/sc/deployments/`. Si se vuelve a
redesplegar, basta con:

```bash
cd rwa-web && ./scripts/sync-contracts.sh && PG_POOL_MAX=2 ./scripts/test_e2e_o2.sh
```

`rwa-sc` queda intacto salvo el artefacto de despliegue nuevo (esperado).

*Fin de la evidencia — O2.7*
