#!/usr/bin/env node
/**
 * docker_validate_o5.mjs — validación estática de los assets Docker (O5.1/O5.2).
 *
 * No requiere Docker: valida el Dockerfile, el compose contra el esquema oficial,
 * las variables de la plantilla y que los artefactos `standalone` que copia la
 * imagen existan para las 3 apps. El build real (`docker build`) necesita un
 * host con Docker; este gate evita que los assets se rompan mientras tanto.
 *
 * Uso: node scripts/docker_validate_o5.mjs   (tras `pnpm -r build`)
 * Sale con 1 si alguna comprobación falla.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { DockerfileParser } from 'dockerfile-ast';
import Ajv2020 from 'ajv/dist/2020.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPS = [
  ['identity', 4001],
  ['issuer', 4002],
  ['token', 4003],
];

const failures = [];
const checks = [];

function check(name, condition, detail = '') {
  checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

// --- Dockerfile --------------------------------------------------------------
const dockerfile = readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8');
let parsedDockerfile;
try {
  parsedDockerfile = DockerfileParser.parse(dockerfile);
} catch (error) {
  failures.push(`Dockerfile no parseable: ${error instanceof Error ? error.message : error}`);
}
check('Dockerfile parseable', Boolean(parsedDockerfile));
check('stage builder', /FROM\s+node:22-alpine\s+AS\s+builder/i.test(dockerfile));
check('stage runner', /FROM\s+node:22-alpine\s+AS\s+runner/i.test(dockerfile));
check('ARG APP declarado (builder y runner)', (dockerfile.match(/^ARG APP$/gm) ?? []).length >= 2);
check('instalación con lockfile', dockerfile.includes('pnpm install --frozen-lockfile'));
check('build de la app por APP', dockerfile.includes('pnpm --filter @rwa/${APP} build'));
check(
  'COPY del standalone',
  dockerfile.includes('/repo/apps/${APP}/.next/standalone'),
);
check('COPY de static', dockerfile.includes('/repo/apps/${APP}/.next/static'));
check('COPY de public', dockerfile.includes('/repo/apps/${APP}/public'));
check('HEALTHCHECK en /api/health', /HEALTHCHECK[\s\S]*?\/api\/health/.test(dockerfile));
check('CMD arranca server.js', /CMD[\s\S]*?server\.js/.test(dockerfile));
check('usuario no-root', dockerfile.includes('USER nextjs'));
check('PORT configurable en runtime', dockerfile.includes('PORT=3000'));

// --- artefactos standalone (lo que copia la imagen) --------------------------
for (const [app] of APPS) {
  const nextDir = path.join(ROOT, 'apps', app, '.next');
  const standalone = path.join(nextDir, 'standalone');
  const server = path.join(standalone, 'apps', app, 'server.js');
  check(`${app}: server.js standalone existe`, existsSync(server), server);
  check(`${app}: node_modules standalone existe`, existsSync(path.join(standalone, 'node_modules')));
  check(`${app}: .next/static existe`, existsSync(path.join(nextDir, 'static')));
  check(`${app}: public existe`, existsSync(path.join(ROOT, 'apps', app, 'public')));
  if (existsSync(server)) {
    const source = readFileSync(server, 'utf8');
    check(`${app}: server.js lee PORT/HOSTNAME`, /process\.env\.PORT/.test(source) && /process\.env\.HOSTNAME/.test(source));
    check(`${app}: server.js de tamaño razonable`, statSync(server).size > 0);
  }
}

// --- docker-compose.yml ------------------------------------------------------
const composeRaw = readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');
let compose;
try {
  compose = parseYaml(composeRaw);
  check('compose YAML parseable', true);
} catch (error) {
  check('compose YAML parseable', false, error instanceof Error ? error.message : String(error));
}

if (compose) {
  const schema = JSON.parse(readFileSync(path.join(ROOT, 'scripts/schemas/compose-spec.json'), 'utf8'));
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  const validate = ajv.compile(schema);
  const valid = validate(compose);
  check(
    'compose cumple el esquema oficial compose-spec',
    valid,
    valid ? '' : JSON.stringify(validate.errors?.slice(0, 3)),
  );

  const services = compose.services ?? {};
  for (const [app, hostPort] of APPS) {
    const service = services[app];
    check(`compose: servicio ${app}`, Boolean(service));
    if (!service) continue;
    check(`compose: ${app} build arg APP`, service.build?.args?.APP === app);
    check(
      `compose: ${app} publica :${hostPort}→3000`,
      (service.ports ?? []).some((entry) => String(entry) === `${hostPort}:3000`),
    );
    check(`compose: ${app} depende de db healthy`, service.depends_on?.db?.condition === 'service_healthy');
    check(
      `compose: ${app} recibe secretos`,
      ['DATABASE_URL', 'SIWE_SESSION_SECRET', 'KYC_ENCRYPTION_KEY'].every(
        (key) => service.environment?.[key] !== undefined,
      ),
    );
  }

  check('compose: servicio db con healthcheck', Boolean(services.db?.healthcheck?.test));
  check(
    'compose: db inicializa base_datos.sql',
    (services.db?.volumes ?? []).some((volume) => String(volume).includes('RepoTecnico/base_datos.sql')),
  );
  check('compose: Anvil opcional (profile chain)', (services.anvil?.profiles ?? []).includes('chain'));
  check('compose: Anvil con healthcheck', Boolean(services.anvil?.healthcheck?.test));
}

// --- plantilla de entorno ----------------------------------------------------
const envCompose = readFileSync(path.join(ROOT, '.env.compose.example'), 'utf8');
for (const key of [
  'DATABASE_URL',
  'POSTGRES_PASSWORD',
  'NEXT_PUBLIC_CHAIN_ID',
  'NEXT_PUBLIC_RPC_URL',
  'SIWE_SESSION_SECRET',
  'KYC_ENCRYPTION_KEY',
]) {
  check(`.env.compose.example define ${key}`, new RegExp(`^${key}=`, 'm').test(envCompose));
}

// --- runtime Docker (informativo) -------------------------------------------
const dockerAvailable = process.env.DOCKER_AVAILABLE === '1';

console.log('Validación estática de assets Docker (O5.1/O5.2)\n');
for (const { name, ok, detail } of checks) {
  console.log(`${ok ? '✅' : '❌'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
}
console.log(
  `\n${checks.length - failures.length}/${checks.length} comprobaciones OK.` +
    (dockerAvailable ? '' : ' (docker no disponible en este host: build real pendiente)'),
);
if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} fallo(s) de validación Docker:`);
  for (const failure of failures) console.error(`  • ${failure}`);
  process.exit(1);
}
console.log('✓ assets Docker válidos (Dockerfile + compose-spec + artefactos standalone).');
