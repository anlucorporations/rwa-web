# 🔗 Artefactos de datos compartidos — Regla de sincronización

**Proyecto:** RWA · **Fecha de alta:** 2026-10-14 · **Estado:** ✅ sincronizados y verificados

El modelo de datos del proyecto es **compartido** entre las dos líneas de desarrollo: documenta el
**modelo on-chain** (contratos de `rwa-sc/sc/src/`) y el **modelo off-chain** (PostgreSQL, esquema
`rwa`, consumido por el frontend de `rwa-web/`). Por decisión del usuario, cada artefacto existe en
**los dos repositorios** con el mismo contenido.

| Artefacto | Canónico (línea `@sc`) | Espejo (línea `@web`) | Rol |
|---|---|---|---|
| `base_datos.sql` | `rwa-sc/RepoTecnico/base_datos.sql` | `rwa-web/RepoTecnico/base_datos.sql` | DDL real PostgreSQL del esquema `rwa` |
| `diccionario_datos.md` | `rwa-sc/RepoTecnico/diccionario_datos.md` | `rwa-web/RepoTecnico/diccionario_datos.md` | Diccionario: on-chain + off-chain |
| `diagrama_er.md` | `rwa-sc/RepoTecnico/diagrama_er.md` | `rwa-web/RepoTecnico/diagrama_er.md` | Diagrama entidad-relación: on-chain + off-chain |

---

## 📏 Regla

1. **Fuente canónica:** `rwa-sc/RepoTecnico/`. Los cambios de modelo de datos se editan **solo** en el canónico.
2. **Espejo obligatorio:** tras editar, copiar al espejo con `check_sincronizacion_datos.sh --sync`.
3. **Deben ser idénticos byte a byte.** Cualquier deriva es un fallo de proceso.
4. **Verificación en el mismo turno:** ejecutar `check_sincronizacion_datos.sh --check` (sale `0` si están sincronizados, `1` si hay deriva).
5. **Si el cambio nace en `@web`** (p. ej. un ajuste del frontend al esquema), se aplica con
   `--sync --from web` para propagarlo al canónico y **se actualiza la versión/changelog en el mismo turno**.
6. Los tres artefactos se actualizan **juntos** (regla heredada de la sincronización de datos: H-13/H-14 de la auditoría).

## 🛠️ Herramienta

```bash
# Verificar (gate; 0 = sincronizado, 1 = deriva)
rwa-web/RepoTecnico/check_sincronizacion_datos.sh --check

# Sincronizar canónico -> espejo
rwa-web/RepoTecnico/check_sincronizacion_datos.sh --sync

# Sincronizar espejo -> canónico (cambio nacido en @web)
rwa-web/RepoTecnico/check_sincronizacion_datos.sh --sync --from web

# Ver hashes de los dos lados
rwa-web/RepoTecnico/check_sincronizacion_datos.sh --hashes
```

## ✅ Estado verificado (última sincronización: 2026-10-24, indexer H-12/H-21)

| Artefacto | Versión | sha256 (idéntico en ambos lados) |
|---|---|---|
| `base_datos.sql` | v1.2 | `835a9dac829bae4f09e5f15d04b96014e325e0b464f059c885506e9906082f8e` |
| `diccionario_datos.md` | v1.4 | `4cc5c3ac6a2dcebdfc3e742e903f2f9693ebb1a147da95d07d96caddb8989f04` |
| `diagrama_er.md` | v1.4 | `7a583661b508a9a4a9fddef0094e8dbe71c6ab5b68937c9a513b9f1461d084c9` |

> Los hashes cambian en cada actualización de datos; regéneralos con `check_sincronizacion_datos.sh --hashes`.
> Verificación reproducible: `rwa-web/RepoTecnico/check_sincronizacion_datos.sh --check` → 3× `✓ … sincronizados`, exit `0`.
