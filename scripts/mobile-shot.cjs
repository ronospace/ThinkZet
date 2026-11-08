// Mobile verification without a viewport flag: launch a second browser with a real
// device window size via CDP, load the app, and capture. Proves the responsive rules.
const { execFileSync } = require('node:child_process');
const http = require('node:http');

const W = Number(process.argv[2] || 390);
const H = Number(process.argv[3] || 844);
const URL_ = process.argv[4] || 'http://127.0.0.1:4173/?app=1';
const OUT = process.argv[5] || '/tmp/mobile.png';

function cdp(port, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve(b ? JSON.parse(b) : {}));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const fs = require('node:fs');
  const base = require('node:path').join(process.env.HOME, '.agent-browser', 'browsers');
  const dir = fs.readdirSync(base).find((d) => d.startsWith('chrome-'));
  const chrome = require('node:path').join(base, dir, 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
  if (!fs.existsSync(chrome)) throw new Error('chrome not found at ' + chrome);
  const { spawn } = require('node:child_process');
  const port = 9333;
  const proc = spawn(chrome, [
    `--remote-debugging-port=${port}`,
    `--window-size=${W},${H}`,
    '--headless=new',
    '--no-first-run',
    '--user-data-dir=/tmp/mobile-profile',
    'about:blank',
  ], { stdio: 'ignore', detached: true });
  proc.unref();
  await new Promise((r) => setTimeout(r, 2500));
  const targets = await cdp(port, '/json/list');
  const page = targets.find((t) => t.type === 'page');
  const ws = page.webSocketDebuggerUrl;
  const WebSocket = require('node:worker_threads') && globalThis.WebSocket;
  const sock = new WebSocket(ws);
  let id = 0;
  const send = (method, params = {}) => new Promise((resolve) => {
    const myId = ++id;
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id === myId) { sock.removeEventListener('message', onMsg); resolve(m.result); }
    };
    sock.addEventListener('message', onMsg);
    sock.send(JSON.stringify({ id: myId, method, params }));
  });
  await new Promise((r) => sock.addEventListener('open', r));
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
  await send('Page.enable');
  await send('Page.navigate', { url: URL_ });
  await new Promise((r) => setTimeout(r, 3500));
  await send('Runtime.evaluate', { expression: "localStorage.setItem('mirrorspread-theme','light');location.reload()" });
  await new Promise((r) => setTimeout(r, 3500));
  await send('Runtime.evaluate', { expression: "showApp();go('radar')" });
  await new Promise((r) => setTimeout(r, 2500));
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  require('node:fs').writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  const metrics = await send('Runtime.evaluate', { expression: "JSON.stringify({docW:document.documentElement.scrollWidth,winW:innerWidth})", returnByValue: true });
  console.log('metrics', metrics.result.value);
  console.log('saved', OUT);
  try { process.kill(-proc.pid); } catch (e) {}
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
