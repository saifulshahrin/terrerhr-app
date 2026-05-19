import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const DEBUG_PORT = process.env.DEBUG_PORT ?? '9222';
const APP_URL = process.env.APP_URL ?? 'http://127.0.0.1:4173/';
const OUT_DIR = process.env.OUT_DIR ?? path.join('artifacts', 'screens');

async function fetchJson(url, retries = 40) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      await sleep(250);
    }
  }
  throw lastErr ?? new Error(`Failed to fetch ${url}`);
}

function createCdp(ws) {
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message ?? 'CDP error'));
      else resolve(msg.result);
      return;
    }

    if (msg.method) {
      const cbs = listeners.get(msg.method);
      if (cbs) cbs.forEach((cb) => cb(msg.params));
    }
  });

  function on(method, cb) {
    const existing = listeners.get(method) ?? [];
    existing.push(cb);
    listeners.set(method, existing);
    return () => {
      const next = (listeners.get(method) ?? []).filter((x) => x !== cb);
      listeners.set(method, next);
    };
  }

  function send(method, params) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });
    return result?.result?.value;
  }

  return { send, on, evaluate };
}

async function waitForReady(cdp) {
  for (let i = 0; i < 80; i++) {
    const ready = await cdp.evaluate('document.readyState');
    if (ready === 'complete') return;
    await sleep(250);
  }
}

async function waitForSelector(cdp, selector, retries = 60) {
  for (let i = 0; i < retries; i++) {
    const exists = await cdp.evaluate(
      `Boolean(document.querySelector(${JSON.stringify(selector)}))`
    );
    if (exists) return true;
    await sleep(250);
  }
  return false;
}

async function clickButtonContaining(cdp, text, scopeSelector) {
  const expr = `(() => {
    const root = ${scopeSelector ? `document.querySelector(${JSON.stringify(scopeSelector)})` : 'document'};
    if (!root) return false;
    const buttons = Array.from(root.querySelectorAll('button'));
    const btn = buttons.find(b => (b.textContent || '').includes(${JSON.stringify(text)}));
    if (!btn) return false;
    btn.click();
    return true;
  })()`;
  return Boolean(await cdp.evaluate(expr));
}

async function captureScreenshot(cdp, filename, clip) {
  const result = await cdp.send('Page.captureScreenshot', clip ? { format: 'png', clip } : { format: 'png' });
  const bytes = Buffer.from(result.data, 'base64');
  await fs.writeFile(filename, bytes);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const targets = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const target =
    targets.find((t) => t.type === 'page' && typeof t.url === 'string' && t.url.startsWith(APP_URL)) ??
    targets.find((t) => t.type === 'page');

  if (!target?.webSocketDebuggerUrl) {
    throw new Error('No CDP page target found.');
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  const cdp = createCdp(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await cdp.send('Page.navigate', { url: APP_URL });
  await waitForReady(cdp);
  await sleep(750);

  // Role selection (Admin) for consistent "stakeholder" screenshots.
  await clickButtonContaining(cdp, 'Admin', 'body');
  await sleep(250);
  await clickButtonContaining(cdp, 'Continue as', 'body');
  await waitForSelector(cdp, 'aside');
  await sleep(800);

  // Dashboard
  await captureScreenshot(cdp, path.join(OUT_DIR, 'dashboard.png'));

  // Pipeline
  await clickButtonContaining(cdp, 'Pipeline', 'aside');
  await sleep(900);
  await captureScreenshot(cdp, path.join(OUT_DIR, 'pipeline.png'));

  // Attempt to crop a focused AI block screenshot from the Pipeline detail panel.
  const aiRect = await cdp.evaluate(`(() => {
    const ps = Array.from(document.querySelectorAll('p'));
    const label = ps.find(p => (p.textContent || '').trim() === 'Terrer AI Review');
    if (!label) return null;
    const box = label.closest('div')?.parentElement?.closest('div') ?? label.closest('div');
    if (!box) return null;
    const r = box.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  })()`);

  if (aiRect && aiRect.width > 0 && aiRect.height > 0) {
    const pad = 10;
    const clip = {
      x: Math.max(0, Math.floor(aiRect.x - pad)),
      y: Math.max(0, Math.floor(aiRect.y - pad)),
      width: Math.min(1440, Math.ceil(aiRect.width + pad * 2)),
      height: Math.min(900, Math.ceil(aiRect.height + pad * 2)),
      scale: 1,
    };
    await captureScreenshot(cdp, path.join(OUT_DIR, 'ai-block.png'), clip);
  }

  // Hiring Intelligence
  await clickButtonContaining(cdp, 'Hiring Intelligence', 'aside');
  await sleep(900);
  await captureScreenshot(cdp, path.join(OUT_DIR, 'hiring-intelligence.png'));

  ws.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

