import { LoadingState } from '@rwa/ui';

/** Estado de carga raíz de la app de identidad (RF-W-16 / RNF-W-05). */
export default function Loading() {
  return <LoadingState label="Cargando identidad…" />;
}
