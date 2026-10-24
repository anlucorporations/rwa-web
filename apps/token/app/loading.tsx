import { LoadingState } from '@rwa/ui';

/** Estado de carga raíz de la app de token (RF-W-16 / RNF-W-05). */
export default function Loading() {
  return <LoadingState label="Cargando token…" />;
}
