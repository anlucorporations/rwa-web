/**
 * Política de subida de documentos KYC (RF-W-05 / HW-02 / M-6).
 *
 * Cierra el hallazgo de "subida sin cuota ni rate limit": el límite de tamaño
 * por fichero ya existía, aquí se añaden la tasa por wallet y la cuota de
 * almacenamiento. La lógica es pura (sin BD) para poder testearla; la ruta de
 * subida obtiene los contadores de los repositorios y llama a
 * `evaluateUploadLimits`.
 *
 * Variables de entorno (todas opcionales, con valores por defecto):
 *   UPLOAD_MAX_MB        — tamaño máximo por fichero (por defecto 10)
 *   UPLOAD_MAX_PER_HOUR  — subidas máximas por wallet y hora (por defecto 20)
 *   UPLOAD_QUOTA_MB      — almacenamiento máximo acumulado por wallet (por defecto 50)
 */

const MB = 1024 * 1024;

export const UPLOAD_LIMIT_DEFAULTS = {
  maxFileMb: 10,
  maxPerHour: 20,
  quotaMb: 50,
} as const;

export type UploadLimitPolicy = {
  maxFileBytes: number;
  maxUploadsPerHour: number;
  quotaBytes: number;
};

export type UploadLimitReason = 'file-size' | 'rate' | 'quota';

export type UploadLimitDecision =
  | { allowed: true }
  | { allowed: false; reason: UploadLimitReason; message: string };

function positiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

/** Lee la política de `process.env` (o del objeto inyectado en tests). */
export function readUploadLimitPolicy(
  env: Record<string, string | undefined> = process.env,
): UploadLimitPolicy {
  return {
    maxFileBytes: positiveInt(env.UPLOAD_MAX_MB, UPLOAD_LIMIT_DEFAULTS.maxFileMb) * MB,
    maxUploadsPerHour: positiveInt(env.UPLOAD_MAX_PER_HOUR, UPLOAD_LIMIT_DEFAULTS.maxPerHour),
    quotaBytes: positiveInt(env.UPLOAD_QUOTA_MB, UPLOAD_LIMIT_DEFAULTS.quotaMb) * MB,
  };
}

export function formatMb(bytes: number): string {
  return `${(bytes / MB).toFixed(0)} MB`;
}

/** Decide si una subida cabe en la política (tamaño, tasa y cuota). */
export function evaluateUploadLimits(input: {
  sizeBytes: number;
  uploadsLastHour: number;
  storedBytes: number;
  policy: UploadLimitPolicy;
}): UploadLimitDecision {
  const { sizeBytes, uploadsLastHour, storedBytes, policy } = input;

  if (sizeBytes <= 0 || sizeBytes > policy.maxFileBytes) {
    return {
      allowed: false,
      reason: 'file-size',
      message: `tamaño de fichero inválido (máx. ${formatMb(policy.maxFileBytes)})`,
    };
  }

  if (uploadsLastHour >= policy.maxUploadsPerHour) {
    return {
      allowed: false,
      reason: 'rate',
      message: `límite de subidas alcanzado (máx. ${policy.maxUploadsPerHour}/hora)`,
    };
  }

  if (storedBytes + sizeBytes > policy.quotaBytes) {
    return {
      allowed: false,
      reason: 'quota',
      message: `cuota de almacenamiento alcanzada (máx. ${formatMb(policy.quotaBytes)})`,
    };
  }

  return { allowed: true };
}
