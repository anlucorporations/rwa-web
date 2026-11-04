# @rwa/metaplace

Shell único del Metaplace (RF-V3-01) que aloja las tres suites (Identity, Issuer, Token).

Estado: **esqueleto de C1**. Incluye portada, `catalogo` y `login` con mensajes de firma legibles
(`@rwa/wallet-messages`) y un `GET /api/health` mínimo.

```bash
pnpm --filter @rwa/metaplace dev      # desarrollo
pnpm --filter @rwa/metaplace build    # build standalone
```

SIWE (`/api/auth/*`), `/api/identity` y la página `/identidad` están conectados (C1). El catálogo real
(CU-01) se implementa en C3 sobre `listings`.
