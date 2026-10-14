#!/usr/bin/env bash
# =============================================================================
# check_sincronizacion_datos.sh — Verifica/sincroniza los artefactos de datos
# compartidos entre las dos líneas de desarrollo del proyecto RWA.
#
#   Canónico (línea @sc):  rwa-sc/RepoTecnico/<archivo>
#   Espejo   (línea @web): rwa-web/RepoTecnico/<archivo>
#
# Uso:
#   ./check_sincronizacion_datos.sh            # --check (por defecto): falla si hay deriva
#   ./check_sincronizacion_datos.sh --check    # compara sha256 de los dos juegos
#   ./check_sincronizacion_datos.sh --sync     # copia canónico -> espejo
#   ./check_sincronizacion_datos.sh --sync --from web   # copia espejo -> canónico
#   ./check_sincronizacion_datos.sh --hashes   # imprime sha256 de ambos lados
#
# Códigos de salida: 0 = sincronizados (o sync aplicado) · 1 = deriva/error de uso
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SC_DIR="$ROOT/rwa-sc/RepoTecnico"
WEB_DIR="$ROOT/rwa-web/RepoTecnico"

FILES=(base_datos.sql diccionario_datos.md diagrama_er.md)

MODE="check"
FROM="sc"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --check)  MODE="check" ;;
    --sync)   MODE="sync" ;;
    --hashes) MODE="hashes" ;;
    --from)   shift; FROM="${1:-sc}" ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "Opción desconocida: $1" >&2; exit 1 ;;
  esac
  shift
done

if [[ "$FROM" != "sc" && "$FROM" != "web" ]]; then
  echo "Error: --from debe ser 'sc' o 'web'" >&2; exit 1
fi

case "$MODE" in
  check|sync)
    for f in "${FILES[@]}"; do
      src="$SC_DIR/$f"; dst="$WEB_DIR/$f"
      [[ -f "$src" ]] || { echo "✗ FALTA canónico: $src" >&2; exit 1; }
      [[ -f "$dst" ]] || { echo "✗ FALTA espejo:   $dst" >&2; exit 1; }
      h_src="$(sha256sum "$src" | cut -d' ' -f1)"
      h_dst="$(sha256sum "$dst" | cut -d' ' -f1)"
      if [[ "$h_src" == "$h_dst" ]]; then
        printf '✓ %-24s sincronizados  (%s)\n' "$f" "${h_src:0:16}"
        continue
      fi
      # Hay deriva
      if [[ "$MODE" == "sync" ]]; then
        if [[ "$FROM" == "sc" ]]; then cp -p "$src" "$dst"; srcp="$src"; dstp="$dst"
        else cp -p "$dst" "$src"; srcp="$dst"; dstp="$src"; fi
        echo "⟳ $f sincronizado: $srcp -> $dstp"
      else
        printf '✗ %-24s DERIVA  sc=%s web=%s\n' "$f" "${h_src:0:16}" "${h_dst:0:16}"
        echo "  Ejecuta: $0 --sync  (o --sync --from web si el cambio nació en @web)" >&2
        exit 1
      fi
    done
    ;;
  hashes)
    for f in "${FILES[@]}"; do
      printf '%-24s sc=%s  web=%s\n' "$f" \
        "$(sha256sum "$SC_DIR/$f" 2>/dev/null | cut -d' ' -f1)" \
        "$(sha256sum "$WEB_DIR/$f" 2>/dev/null | cut -d' ' -f1)"
    done
    ;;
esac

if [[ "$MODE" == "sync" ]]; then
  echo "Sincronización completada; verificando…"
  exec "$0" --check
fi
