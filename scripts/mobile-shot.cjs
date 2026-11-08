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
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: process.env.DESKTOP ? 1 : 2, mobile: !process.env.DESKTOP });
  await send('Page.enable');
  await send('Page.navigate', { url: URL_ });
  await new Promise((r) => setTimeout(r, 3500));
  await send('Runtime.evaluate', { expression: "localStorage.setItem('mirrorspread-theme','" + (process.env.THEME || 'light') + "');location.reload()" });
  await new Promise((r) => setTimeout(r, 3500));
  const ev = await send('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression: process.env.APP_MODE === 'auth' ? "showApp();go('auth')" : process.env.VIEW ? "showApp();go('" + process.env.VIEW + "')" : process.env.APP_MODE === 'app' ? "showApp();go('radar')" : "showLanding()" });
  if (ev.exceptionDetails) console.log('eval error', JSON.stringify(ev.exceptionDetails).slice(0, 300));
  await new Promise((r) => setTimeout(r, 2500));
  if (process.env.SCROLL) { await send('Runtime.evaluate', { expression: "window.scrollTo(0," + Number(process.env.SCROLL) + ");document.querySelector('main').scrollTo(0," + Number(process.env.SCROLL) + ")" }); await new Promise((r) => setTimeout(r, 600)); }
  if (process.env.FOCUS) { await send('Runtime.evaluate', { expression: "(()=>{const e=document.querySelector('" + process.env.FOCUS + "');if(e){e.scrollIntoView({block:'start'});window.scrollBy(0,-70)}})()" }); await new Promise((r) => setTimeout(r, 700)); }
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  require('node:fs').writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  if (process.env.WIDE) { const w = await send('Runtime.evaluate', { returnByValue: true, expression: "JSON.stringify([...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+2).slice(0,8).map(e=>e.tagName+'.'+e.className+' w='+Math.round(e.getBoundingClientRect().width)))" }); console.log('wide', w.result.value); }
  if (process.env.TOPBAR) { const w = await send('Runtime.evaluate', { returnByValue: true, expression: "(()=>{const t=document.querySelector('.topbar');const r=e=>{const b=document.querySelector(e).getBoundingClientRect();return Math.round(b.left)+'-'+Math.round(b.right)};return JSON.stringify({vw:innerWidth,topbar:r('.topbar'),sw:t.scrollWidth,cw:t.clientWidth,h1:r('#view-title'),pill:r('#live-pill'),cmdk:r('#cmdk'),theme:r('#theme-btn'),more:r('#tb-more'),pad:getComputedStyle(t).paddingRight,main:r('main')})})()" }); console.log('topbar', w.result.value); }
  if (process.env.LAYOUT) { const w = await send('Runtime.evaluate', { returnByValue: true, expression: "JSON.stringify(['.land-nav-wrap','.land-nav','.land-brand','.land-nav-links','.land-nav > div:last-child','.land-wrap','.hero-sec','.check','.land-footer','.foot-legal','.view','.topbar'].map(q=>{const e=document.querySelector(q);if(!e||!e.offsetWidth)return q+': -';const b=e.getBoundingClientRect();return q+': '+Math.round(b.left)+'..'+Math.round(b.right)+' w='+Math.round(b.width)}))" }); console.log('layout', w.result.value); }
  if (process.env.NAVCSS) { const w = await send('Runtime.evaluate', { returnByValue: true, expression: "(()=>{const n=document.querySelector('.land-nav');const c=getComputedStyle(n);const b=document.querySelector('.land-brand').getBoundingClientRect();const m=document.querySelector('.land-brand .mark');return JSON.stringify({pad:c.padding,max:c.maxWidth,margin:c.margin,brandLeft:Math.round(b.left),markLeft:Math.round(m.getBoundingClientRect().left),scrollY:scrollY})})()" }); console.log('navcss', w.result.value); }
  if (process.env.BRAND) { const w = await send('Runtime.evaluate', { returnByValue: true, expression: "(()=>{const q=(e)=>document.querySelector(e);const m=q('.land-brand .mark');const u=m.querySelector('use');const sym=document.getElementById('tz-mark');const wm=q('.land-brand .wm i');const cs=getComputedStyle(wm);const r=m.getBoundingClientRect();return JSON.stringify({markPx:Math.round(r.width)+'x'+Math.round(r.height),useResolves:!!sym&&u.getAttribute('href')==='#tz-mark',symbolShapes:sym.children.length,wordmarkGradient:cs.backgroundImage.slice(0,40),wordmarkTransparentText:cs.webkitTextFillColor,railMark:!!q('.logo .mark use'),railWordmark:q('.logo .wm')?.textContent,oldTSquare:!!document.querySelector('.logo .mark:not(svg)')})})()" }); console.log('brand', w.result.value); }
  const metrics = await send('Runtime.evaluate', { expression: "JSON.stringify({docW:document.documentElement.scrollWidth,winW:innerWidth})", returnByValue: true });
  console.log('metrics', metrics.result.value);
  console.log('saved', OUT);
  try { process.kill(-proc.pid); } catch (e) {}
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
