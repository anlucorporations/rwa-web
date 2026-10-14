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

## ✅ Estado verificado (2026-10-14)

| Artefacto | sha256 (idéntico en ambos lados) |
|---|---|
| `base_datos.sql` | `732ec81ce52589e4af5db3e85a5c6dab292c84d0fdabf52cc4e405b67785614f` |
| `diccionario_datos.md` | `24eb417059149b1eaea9ff816a24979db912e895bd053f69976da8117db4e107` |
| `diagrama_er.md` | `32e71fc2dc46afc20c00fd49cc516ec17f90e9e0c6d42aca14020d3ea7f08990` |

> Verificación reproducible: `rwa-web/RepoTecnico/check_sincronizacion_datos.sh --check` → 3× `✓ … sincronizados`, exit `0`.
