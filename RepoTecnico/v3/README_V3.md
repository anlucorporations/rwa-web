# RWA v3 «Barlo Metaplace» — espejo de artefactos de datos

> **Estado:** Fase 1 **en corrección / NO cerrada** · esquema `3.0` · revisión documental `v3.1`.

Este directorio contiene el **espejo byte a byte** de los artefactos de datos compartidos de la v3
(canónicos en `rwa-sc/RepoTecnico/v3/`, mismo acuerdo que en la v2):

| Archivo | Contenido |
|---|---|
| `base_datos.sql` | Esquema PostgreSQL 15 (26 tablas, enums, triggers, semillas) |
| `migracion_v2_a_v3.sql` | Migración v2→v3 (archiva 12 tablas, ETL, registra `3.0`) |
| `diccionario_datos.md` | Diccionario de datos de las 26 tablas |
| `diagrama_er.md` | Diagrama Entidad-Relación (Mermaid) |

**Resto de la documentación v3** (brief, requerimientos, propuesta, entornos, estado, auditorías y
acta de validación): `rwa-sc/RepoTecnico/v3/`.

**Verificación:** `python3 rwa-sc/RepoTecnico/v3/verificar_artefactos.py`.

> Los cuatro archivos deben permanecer idénticos a sus canónicos (mismo hash). Cualquier cambio en el
> esquema o en el modelo de datos se aplica primero en `rwa-sc` y se copia aquí en el mismo commit.
