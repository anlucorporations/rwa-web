import { describe, expect, it } from 'vitest';

import {
  UPLOAD_LIMIT_DEFAULTS,
  evaluateUploadLimits,
  readUploadLimitPolicy,
} from './upload-limits';

const MB = 1024 * 1024;

describe('readUploadLimitPolicy', () => {
  it('usa los valores por defecto sin variables de entorno', () => {
    const policy = readUploadLimitPolicy({});
    expect(policy.maxFileBytes).toBe(UPLOAD_LIMIT_DEFAULTS.maxFileMb * MB);
    expect(policy.maxUploadsPerHour).toBe(UPLOAD_LIMIT_DEFAULTS.maxPerHour);
    expect(policy.quotaBytes).toBe(UPLOAD_LIMIT_DEFAULTS.quotaMb * MB);
  });

  it('lee y convierte las variables de entorno', () => {
    const policy = readUploadLimitPolicy({
      UPLOAD_MAX_MB: '5',
      UPLOAD_MAX_PER_HOUR: '3',
      UPLOAD_QUOTA_MB: '25',
    });
    expect(policy).toEqual({
      maxFileBytes: 5 * MB,
      maxUploadsPerHour: 3,
      quotaBytes: 25 * MB,
    });
  });

  it('ignora valores inválidos y usa el fallback', () => {
    const policy = readUploadLimitPolicy({
      UPLOAD_MAX_MB: 'abc',
      UPLOAD_MAX_PER_HOUR: '0',
      UPLOAD_QUOTA_MB: '-4',
    });
    expect(policy.maxFileBytes).toBe(UPLOAD_LIMIT_DEFAULTS.maxFileMb * MB);
    expect(policy.maxUploadsPerHour).toBe(UPLOAD_LIMIT_DEFAULTS.maxPerHour);
    expect(policy.quotaBytes).toBe(UPLOAD_LIMIT_DEFAULTS.quotaMb * MB);
  });
});

describe('evaluateUploadLimits', () => {
  const policy = { maxFileBytes: 10 * MB, maxUploadsPerHour: 2, quotaBytes: 50 * MB };

  it('permite una subida dentro de los límites', () => {
    expect(
      evaluateUploadLimits({ sizeBytes: 1 * MB, uploadsLastHour: 0, storedBytes: 0, policy }),
    ).toEqual({ allowed: true });
  });

  it('rechaza un fichero demasiado grande', () => {
    const result = evaluateUploadLimits({
      sizeBytes: 11 * MB,
      uploadsLastHour: 0,
      storedBytes: 0,
      policy,
    });
    expect(result).toMatchObject({ allowed: false, reason: 'file-size' });
  });

  it('rechaza un fichero vacío', () => {
    const result = evaluateUploadLimits({
      sizeBytes: 0,
      uploadsLastHour: 0,
      storedBytes: 0,
      policy,
    });
    expect(result).toMatchObject({ allowed: false, reason: 'file-size' });
  });

  it('rechaza al alcanzar el límite por hora', () => {
    const result = evaluateUploadLimits({
      sizeBytes: 1 * MB,
      uploadsLastHour: 2,
      storedBytes: 0,
      policy,
    });
    expect(result).toMatchObject({ allowed: false, reason: 'rate' });
  });

  it('rechaza al superar la cuota acumulada', () => {
    const result = evaluateUploadLimits({
      sizeBytes: 1 * MB,
      uploadsLastHour: 0,
      storedBytes: 50 * MB,
      policy,
    });
    expect(result).toMatchObject({ allowed: false, reason: 'quota' });
  });

  it('permite justo en el borde de la cuota', () => {
    expect(
      evaluateUploadLimits({
        sizeBytes: 10 * MB,
        uploadsLastHour: 0,
        storedBytes: 40 * MB,
        policy,
      }),
    ).toEqual({ allowed: true });
  });
});
