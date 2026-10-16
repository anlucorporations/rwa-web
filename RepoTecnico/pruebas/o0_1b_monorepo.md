# Evidencia O0.1b — Monorepo mínimo y estado de la etapa `@web` (2026-10-14)

> **Tarea:** O0.1b (preparación del ciclo O0) — decisión de arranque del bloque 1:
> monorepo mínimo pnpm (`pnpm-workspace.yaml` + `packages/shared`) **sin mover las apps**.
> **Requisito:** RT-W-05 (workspace pnpm) · **Decisión:** D-089 (hardening + monorepo), D-102 (línea `@web`).

## 1. Qué se creó

| Fichero | Rol |
|---|---|
| `pnpm-workspace.yaml` | Workspaces: `packages/*` + las 3 apps en alcance (`web-identity`, `web-registry-trusted`, `web-token`). `web-rwa` y `web-registry-trusted2` quedan fuera hasta O4.4/O4.5. |
| `package.json` (raíz) | `packageManager: pnpm@9.15.9`, scripts `dev:identity/dev:issuer/dev:token`, `build`, `lint`, `typecheck`. |
| `packages/shared/package.json` | Paquete `@rwa/shared` con `pg` + `zod` (base de O0.2). |
| `packages/shared/tsconfig.json` | TS `strict` + `noEmit`, ESM. |
| `RepoTecnico/estado_proyecto.md` | Memoria de trabajo de la etapa `@web` (fases, tablero O0, decisiones, reglas). |

## 2. Gate reproducible

```bash
cd /home/dsh/workspace/RWA/rwa-web
pnpm install
```

**Resultado real:** `Done in 1m 3.5s using pnpm v9.15.9` — **exit 0**, `Packages: +412`,
`pnpm-lock.yaml` generado (166.699 bytes).

```bash
pnpm -r exec pwd
```

**Resultado real (4 workspaces reconocidos):**

```
packages/shared
web-identity
web-registry-trusted
web-token
```

```bash
for d in web-identity web-registry-trusted web-token packages/shared; do [ -d "$d/node_modules" ] && echo "$d ✓"; done
```

**Resultado real:** `web-identity ✓ · web-registry-trusted ✓ · web-token ✓ · packages/shared ✓`
(`pg`, `zod`, `@types/pg`, `typescript` presentes en `packages/shared/node_modules`).

## 3. Impacto

- **Desbloquea** `lint`, `tsc --noEmit`, `build` y test en las 3 apps (antes: 0/5 apps con `node_modules`).
- **Elimina** la necesidad de triplicar la capa de datos que exigirá O0.3 (el cliente vivirá una sola vez en `packages/shared`).
- **No** mueve apps ni unifica versiones de `next`/`react`: eso permanece en O4 (RNF-W-03).

## 4. Desviaciones y deuda declarada

- Riesgo 5 de `requerimientos_web.md` §9 (*"sin `node_modules` el primer build puede revelar errores de tipo ocultos"*): **materializado como siguiente paso**; se saldará app por app en O3.4.
- Los `package-lock.json` de npm siguen en el árbol; su retirada corresponde a O3.3 (versión única por workspace).
- `pnpm-lock.yaml` se versiona (es el lockfile canónico del monorepo).

*Fin de la evidencia — O0.1b*
