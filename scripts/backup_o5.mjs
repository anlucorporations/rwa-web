#!/usr/bin/env node
/**
 * backup_o5.mjs — backup y restauración lógica del esquema `rwa` (O5.5, RT-W-07).
 *
 *   node scripts/backup_o5.mjs                    # backup JSON a backups/
 *   node scripts/backup_o5.mjs --restore <file>    # simula restauración (ROLLBACK)
 *   node scripts/backup_o5.mjs --restore <file> --commit   # restaura de verdad
 *
 * No requiere `pg_dump`/`psql`: usa `pg`. El dump incluye todas las tablas de
 * `rwa` con metadatos de integridad (sha256) y es la base del restore, que se
 * ejecuta dentro de una transacción (TRUNCATE + INSERT) para poder simularlo.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const restoreIdx = args.indexOf('--restore');
const restoreFile = restoreIdx >= 0 ? args[restoreIdx + 1] : null;
const COMMIT = args.includes('--commit');

if (!process.env.DATABASE_URL) {
  console.error('✗ DATABASE_URL no definida (source scripts/gcp-env.sh --tcp)');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

const quote = (identifier) => `"${identifier.replaceAll('"', '""')}"`;

function encodeValue(value) {
  if (value === null || value === undefined) return value;
  if (Buffer.isBuffer(value)) return { __t: 'buffer', v: value.toString('base64') };
  if (value instanceof Date) return { __t: 'date', v: value.toISOString() };
  if (typeof value === 'bigint') return { __t: 'bigint', v: value.toString() };
  return value;
}

function decodeValue(value) {
  if (value && typeof value === 'object' && !Array.isArray(value) && '__t' in value) {
    if (value.__t === 'buffer') return Buffer.from(value.v, 'base64');
    if (value.__t === 'date') return new Date(value.v);
    if (value.__t === 'bigint') return BigInt(value.v);
  }
  return value;
}

async function listTables() {
  const { rows } = await client.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'rwa' AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
  );
  return rows.map((row) => row.table_name);
}

async function backup() {
  const tables = await listTables();
  const dump = {
    metadata: {
      createdAt: new Date().toISOString(),
      schema: 'rwa',
      tables: tables.length,
    },
    tables: {},
  };

  for (const table of tables) {
    const { rows } = await client.query(`SELECT * FROM rwa.${quote(table)}`);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    dump.tables[table] = {
      columns,
      rows: rows.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, encodeValue(v)]))),
    };
    console.log(`  ${table.padEnd(28)} ${rows.length} fila(s)`);
  }

  const json = JSON.stringify(dump);
  const sha256 = createHash('sha256').update(json).digest('hex');
  dump.metadata.sha256 = sha256;

  mkdirSync(path.join(ROOT, 'backups'), { recursive: true });
  const file = path.join(ROOT, 'backups', `rwa-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(file, JSON.stringify(dump, null, 2));

  console.log(`\n✓ backup creado: ${path.relative(ROOT, file)}`);
  console.log(`  sha256: ${sha256}`);
  console.log(`  restauración: node scripts/backup_o5.mjs --restore ${path.relative(ROOT, file)}`);
  return file;
}

async function restore(file) {
  const dump = JSON.parse(readFileSync(path.resolve(ROOT, file), 'utf8'));
  const tables = Object.keys(dump.tables);

  await client.query('BEGIN');
  try {
    await client.query(`TRUNCATE ${tables.map((t) => `rwa.${quote(t)}`).join(', ')} CASCADE`);

    let total = 0;
    for (const table of tables) {
      const { columns, rows } = dump.tables[table];
      for (const row of rows) {
        const values = columns.map((column) => decodeValue(row[column]));
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        await client.query(
          `INSERT INTO rwa.${quote(table)} (${columns.map(quote).join(', ')}) VALUES (${placeholders})`,
          values,
        );
        total += 1;
      }
    }

    if (COMMIT) {
      await client.query('COMMIT');
      console.log(`✓ restauración confirmada: ${total} fila(s) en ${tables.length} tabla(s)`);
    } else {
      await client.query('ROLLBACK');
      console.log(`✓ simulación de restauración OK (ROLLBACK): ${total} fila(s) en ${tables.length} tabla(s)`);
      console.log('  para aplicar de verdad: añade --commit');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

try {
  await client.connect();
  if (restoreFile) {
    console.log(`▶ Restaurando ${restoreFile}`);
    await restore(restoreFile);
  } else {
    console.log('▶ Backup lógico de rwa');
    await backup();
  }
} catch (error) {
  console.error('✗ backup/restore falló:', error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
