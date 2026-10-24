#!/usr/bin/env node
/**
 * e2e_claim_o5.mjs — E2E de navegador del flujo identidad → claim → aprobación → addClaim.
 *
 * Requiere:
 *   - Anvil local con el stack desplegado y las apps construidas apuntando a ese RPC
 *     (`scripts/e2e_local_o5.sh` automatiza el despliegue y el build).
 *   - apps de producción en 4011/4012/4013 (`scripts/serve_o5.mjs`) con DATABASE_URL.
 *
 * Usa una wallet inyectada mock (EIP-1193) cuyas firmas las hace viem en Node con las
 * claves públicas de Anvil: no requiere MetaMask ni extensión.
 */

import { chromium } from 'playwright';
import { createPublicClient, createWalletClient, defineChain, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const RPC_URL = process.env.E2E_RPC_URL ?? 'http://127.0.0.1:8546';
const IDENTITY_URL = process.env.E2E_IDENTITY_URL ?? 'http://127.0.0.1:4011';
const ISSUER_URL = process.env.E2E_ISSUER_URL ?? 'http://127.0.0.1:4012';

const CHAIN = defineChain({
  id: 31337,
  name: 'Anvil E2E',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const ACCOUNTS = {
  issuer: {
    // Cuenta owner/issuer por defecto de Anvil (pública, solo test)
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  },
  // El IdentityRegistry es `onlyOwner`: en el stack canónico solo el owner puede
  // registrar identidades. El E2E usa la cuenta owner para inversor y emisor.
  investor: {
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  },
};

const publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });

function walletFor(account) {
  return createWalletClient({
    account: privateKeyToAccount(account.privateKey),
    chain: CHAIN,
    transport: http(RPC_URL),
  });
}

/** Implementación Node del EIP-1193 que consume la página. */
function makeRpcHandler(account) {
  const wallet = walletFor(account);
  return async (method, params = []) => {
    switch (method) {
      case 'eth_chainId':
        return '0x7a69';
      case 'net_version':
        return '31337';
      case 'eth_accounts':
      case 'eth_requestAccounts':
        return [account.address];
      case 'wallet_requestPermissions':
        return [{ parentCapability: 'eth_accounts' }];
      case 'wallet_switchEthereumChain':
      case 'wallet_addEthereumChain':
        return null;
      case 'personal_sign': {
        const data = params[0];
        const message = typeof data === 'string' && data.startsWith('0x')
          ? { raw: data }
          : String(data);
        return wallet.signMessage({ account: wallet.account, message });
      }
      case 'eth_signTypedData_v4': {
        const typed = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1];
        const types = { ...typed.types };
        delete types.EIP712Domain;
        return wallet.signTypedData({
          account: wallet.account,
          domain: typed.domain,
          types,
          primaryType: typed.primaryType,
          message: typed.message,
        });
      }
      case 'eth_sendTransaction': {
        const tx = params[0];
        const hash = await wallet.sendTransaction({
          account: wallet.account,
          to: tx.to,
          data: tx.data,
          value: tx.value ? BigInt(tx.value) : undefined,
          gas: tx.gas ? BigInt(tx.gas) : undefined,
          nonce: tx.nonce !== undefined ? Number(tx.nonce) : undefined,
        });
        console.log(`  [tx] ${hash} → ${tx.to}`);
        return hash;
      }
      case 'eth_estimateGas': {
        const tx = params[0];
        return publicClient.estimateGas({
          account: account.address,
          to: tx.to,
          data: tx.data,
          value: tx.value ? BigInt(tx.value) : undefined,
        });
      }
      case 'eth_getBalance':
        return publicClient.getBalance({ address: params[0] });
      case 'eth_getTransactionReceipt': {
        const receipt = await publicClient.getTransactionReceipt({ hash: params[0] });
        console.log(`  [receipt] ${params[0]} logs=${receipt.logs.length} status=${receipt.status}`);
        if (receipt.logs.length === 0) console.log('    (sin logs)');
        return receipt;
      }
      case 'eth_blockNumber':
        return publicClient.getBlockNumber();
      default:
        return publicClient.request({ method, params });
    }
  };
}

async function newWalletPage(browser, account, url) {
  const context = await browser.newContext();
  await context.exposeFunction('__walletRpc', makeRpcHandler(account));
  await context.addInitScript(({ address }) => {
    const listeners = new Map();
    const provider = {
      isMetaMask: true,
      async request({ method, params }) {
        return window.__walletRpc(method, params ?? []);
      },
      on(event, handler) {
        listeners.set(event, handler);
      },
      removeListener(event) {
        listeners.delete(event);
      },
    };
    window.ethereum = provider;
    // Anuncio del provider (EIP-6963 no es necesario para el conector injected)
    window.dispatchEvent(new Event('ethereum#initialized'));
    void address;
  }, { address: account.address });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);

  // Diagnóstico opcional (E2E_DEBUG=1): consola del navegador, errores de página y
  // peticiones fallidas. Útil para depurar cuelgues de recepción de transacciones.
  if (process.env.E2E_DEBUG === '1') {
    page.on('console', (m) => console.log(`  [browser:${m.type()}] ${m.text()}`));
    page.on('pageerror', (e) => console.log(`  [pageerror] ${e.message}`));
    page.on('requestfailed', (r) =>
      console.log(`  [reqfailed] ${r.method()} ${r.url()} → ${r.failure()?.errorText}`),
    );
  }

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  return { context, page };
}

async function waitForSession(page, address) {
  await page.waitForFunction(
    async (expected) => {
      const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
      if (!response.ok) return false;
      const body = await response.json();
      return body?.data?.address?.toLowerCase() === expected.toLowerCase();
    },
    address,
    { timeout: 60_000 },
  );
}

async function clickByText(page, text) {
  await page.getByRole('button', { name: text }).first().click();
}

/** Conecta de forma robusta (reintenta si la hidratación aún no está lista). */
async function ensureConnected(page, address) {
  const connected = page.getByText(/Connected (Address|Account)/i);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await connected.count()) {
      await waitForSession(page, address);
      return;
    }
    const connect = page.getByRole('button', { name: 'Connect Wallet' });
    if (await connect.count()) {
      await connect.first().click({ timeout: 5_000 }).catch(() => {});
    }
    await page.waitForTimeout(1_000);
  }
  await connected.first().waitFor({ timeout: 30_000 });
  await waitForSession(page, address);
}

async function waitForText(page, text, timeout = 120_000) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout });
}

const step = (message) => console.log(`▶ ${message}`);

let browser;
const pages = {};
const created = { requester: ACCOUNTS.investor.address, issuer: ACCOUNTS.issuer.address };
try {
  browser = await chromium.launch();

  // 1) Inversor: conectar (SIWE) y crear identidad
  step('Inversor: conectar wallet y crear identidad');
  const investor = await newWalletPage(browser, ACCOUNTS.investor, `${IDENTITY_URL}/app`);
  pages.investor = investor.page;
  await ensureConnected(investor.page, ACCOUNTS.investor.address);
  await investor.page.waitForTimeout(1_000);
  // Idempotente: el owner puede venir ya registrado del despliegue.
  const createButton = investor.page.getByRole('button', { name: 'Create Identity' });
  if (await createButton.count()) {
    await createButton.first().click();
    await investor.page
      .getByText(/Identity successfully created and registered|Identity already registered/i)
      .first()
      .waitFor({ timeout: 120_000 });
    console.log('  ✓ identidad creada/registrada');
  } else {
    console.log('  ✓ identidad ya registrada (se continúa)');
  }

  // 2) Inversor: solicitar claim al issuer
  step('Inversor: solicitar claim (firma EIP-191 + POST autenticado)');
  await investor.page.getByText('Request Claim').first().waitFor({ timeout: 60_000 });
  const issuerSelect = investor.page.locator('select').first();
  await issuerSelect.selectOption({ index: 1 });
  const topicSelect = investor.page.locator('select').nth(1);
  await topicSelect.selectOption({ index: 1 });
  await clickByText(investor.page, 'Submit Claim Request');
  await investor.page.getByText('Claim request submitted successfully!').first().waitFor({ timeout: 90_000 });
  console.log('  ✓ solicitud creada');

  // 3) Emisor: conectar (SIWE), abrir solicitud y aprobar firmando EIP-712
  step('Emisor: conectar wallet, revisar y aprobar');
  const issuer = await newWalletPage(browser, ACCOUNTS.issuer, `${ISSUER_URL}/dashboard`);
  pages.issuer = issuer.page;
  await ensureConnected(issuer.page, ACCOUNTS.issuer.address);
  await issuer.page.getByText('Issuer Panel').first().waitFor({ timeout: 60_000 });
  await issuer.page.locator('div.cursor-pointer').filter({ hasText: 'Topic 1' }).first().click();
  await issuer.page.getByRole('button', { name: /Approve & Sign Claim/i }).first().click();
  await issuer.page.getByText(/Request approved successfully/i).first().waitFor({ timeout: 120_000 });
  console.log('  ✓ solicitud aprobada y claim firmado');

  // 4) Inversor: addClaim en su identidad
  step('Inversor: añadir claim a la identidad on-chain');
  await investor.page.getByRole('button', { name: /Refresh/i }).first().click();
  await investor.page.waitForTimeout(3_000);
  await investor.page
    .locator('div.cursor-pointer')
    .filter({ hasText: 'Topic 1' })
    .first()
    .click();
  await investor.page.getByRole('button', { name: /Add Claim to My Identity/i }).first().click();
  await investor.page.getByText(/Claim added to your identity successfully/i).first().waitFor({ timeout: 120_000 });
  console.log('  ✓ claim añadido a la identidad');

  await investor.context.close();
  await issuer.context.close();
  console.log('\n✓ E2E claim-flow en verde (identidad → claim → aprobación → addClaim)');
} catch (error) {
  console.error('\n✗ E2E falló:', error instanceof Error ? error.message : error);
  for (const [name, page] of Object.entries(pages)) {
    if (!page) continue;
    try {
      const text = await page.evaluate(() => document.body.innerText);
      console.error(`\n--- ${name} texto visible (últimos 1500) ---\n${text.slice(-1500)}`);
    } catch {
      /* página cerrada */
    }
  }
  process.exitCode = 1;
} finally {
  await browser?.close();
}
