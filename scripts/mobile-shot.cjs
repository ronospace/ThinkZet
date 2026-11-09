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
  if (process.env.FLOW) { const w = await send('Runtime.evaluate', { returnByValue: true, expression: "(()=>{const q=e=>document.querySelector(e);const r=e=>{const b=q(e).getBoundingClientRect();return {x:Math.round(b.left),w:Math.round(b.width),y:Math.round(b.top+scrollY),h:Math.round(b.height)}};const h1=q('.land-h1');const lh=parseFloat(getComputedStyle(h1).lineHeight);return JSON.stringify({order:[...q('.land-wrap').children].map(e=>e.className.split(' ')[0]||e.id).join('>'),heroKids:[...q('.hero-sec').children].map(e=>e.className.split(' ')[0]).join('>'),wrap:r('.land-wrap'),h1Lines:Math.round(h1.getBoundingClientRect().height/lh),align:getComputedStyle(q('.hero-sec')).textAlign,check:r('.check'),proof:r('.proof'),gapProofToCheck:r('.check').y-(r('.proof').y+r('.proof').h),gapCheckToHow:r('#how').y-(r('.check').y+r('.check').h),inputPx:Math.min(...[...document.querySelectorAll('.check input')].map(i=>i.clientWidth))})})()" }); console.log('flow', w.result.value); }
  if (process.env.AUTHM) { const w = await send('Runtime.evaluate', { returnByValue: true, expression: "(()=>{const q=e=>document.querySelector(e);const c=e=>{const b=q(e).getBoundingClientRect();return Math.round(b.left+b.width/2)};const mainCx=(()=>{const b=q('main').getBoundingClientRect();return Math.round(b.left+b.width/2)})();const v=e=>{const b=q(e).getBoundingClientRect();return Math.round(b.top+b.height/2)};const vis=e=>{const n=q(e);return !!n&&getComputedStyle(n).display!=='none'};return JSON.stringify({contentAreaCentreX:mainCx,cardX:c('.auth-card'),logoX:c('.auth-logo'),titleX:c('.auth-title'),titleAlign:getComputedStyle(q('.auth-head')).alignItems,railVisible:vis('.rail'),topbarVisible:vis('.topbar'),cardCentreY:v('.auth-card'),viewportCentreY:Math.round(innerHeight/2),cardW:Math.round(q('.auth-card').getBoundingClientRect().width),subtitle:!!q('.auth-sub')})})()" }); console.log('authm', w.result.value); }
  if (process.env.SNAPQ) { const w = await send('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression: "(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));const sc=document.body;const nav=document.querySelector('.land-nav-wrap').getBoundingClientRect().height;const ids=['#check','#how','#capabilities','#pricing','#faq'];const out={navHeight:Math.round(nav),snapType:getComputedStyle(sc).scrollSnapType,pad:getComputedStyle(sc).scrollPaddingTop,behavior:getComputedStyle(sc).scrollBehavior,tests:[]};for(const id of ids){const e=document.querySelector(id);const abs=e.getBoundingClientRect().top+sc.scrollTop;for(const off of [60,-60]){sc.scrollTo({top:abs-nav+off,behavior:'instant'});await wait(1100);const top=Math.round(e.getBoundingClientRect().top);out.tests.push(id+' dropped '+(off>0?'60px past':'60px short of')+' -> section top at '+top+'px (nav ends '+Math.round(nav)+'px)')}}return JSON.stringify(out,null,1)})()" }); console.log('snapq', w.result.value); }
  if (process.env.FLIPQ) {
    const ev = async (expr) => (await send('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression: expr })).result.value;
    const wheel = async (dy, n, gap) => { for (let i = 0; i < n; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 500, deltaX: 0, deltaY: dy }); await new Promise((r) => setTimeout(r, gap)); } };
    const state = () => ev("JSON.stringify({view:STATE.view,top:Math.round(document.querySelector('main').scrollTop),atEnd:(()=>{const m=document.querySelector('main');return m.scrollTop+m.clientHeight>=m.scrollHeight-2})(),hint:false})");
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    const log = [];
    await ev("go('pulse')"); await pause(1500);
    log.push('start            ' + await state());
    // 1. scroll to the bottom with one long fast gesture (momentum): must NOT flip
    await wheel(120, 40, 12); await pause(900);
    log.push('after momentum   ' + await state());
    // 2. a fresh deliberate gesture at the bottom: must show hint, then flip
    await wheel(60, 3, 30); await pause(60);
    log.push('gesture begins   ' + await state());
    await wheel(60, 6, 30); await pause(1200);
    log.push('after gesture    ' + await state());
    // 3. scroll up at the top of the new screen: goes back
    await ev("document.querySelector('main').scrollTop=0"); await pause(400);
    await wheel(-60, 14, 30); await pause(1600);
    log.push('scroll up at top ' + await state());
    // 4. inside the chat box and the palette: must never flip
    await ev("go('copilot')"); await pause(1500);
    await ev("(()=>{const m=document.querySelector('main');m.scrollTop=m.scrollHeight})()"); await pause(500);
    log.push('copilot (bottom)' + await state());
    console.log('flipq\n' + log.join('\n'));
  }
  if (process.env.BOTTOM) { const w = await send('Runtime.evaluate', { returnByValue: true, expression: "(()=>{const m=document.querySelector('main');const v=document.getElementById('view');const last=v.lastElementChild;const lb=last.getBoundingClientRect();const nav=document.querySelector('.rail').getBoundingClientRect();const sc=document.scrollingElement;return JSON.stringify({viewPadBottom:getComputedStyle(v).paddingBottom,mainPadBottom:getComputedStyle(m).paddingBottom,lastCardBottom:Math.round(lb.bottom+sc.scrollTop),navTop:Math.round(nav.top+sc.scrollTop),gap:Math.round((nav.top+sc.scrollTop)-(lb.bottom+sc.scrollTop)),docScroll:Math.round(document.scrollingElement.scrollHeight-innerHeight)})})()" }); console.log('bottom', w.result.value); }
  if (process.env.TAIL) { const w = await send('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression: "(async()=>{const cands=[document.scrollingElement,document.body,document.querySelector('main'),document.getElementById('view')];const sc=cands.find(e=>e&&e.scrollHeight>e.clientHeight+4)||document.scrollingElement;const m=document.querySelector('main');const v=document.getElementById('view');const last=v.lastElementChild;sc.scrollTo(0,sc.scrollHeight);window.scrollTo(0,sc.scrollHeight);await new Promise(r=>setTimeout(r,500));const lb=last.getBoundingClientRect();const nav=document.querySelector('.rail').getBoundingClientRect();return JSON.stringify({scrollH:sc.scrollHeight,innerH:innerHeight,mainPadB:getComputedStyle(m).paddingBottom,viewPadB:getComputedStyle(v).paddingBottom,lastBottom:Math.round(lb.bottom),navTop:Math.round(nav.top),navH:Math.round(nav.height),gapToNav:Math.round(nav.top-lb.bottom),scrollY:Math.round(sc.scrollTop)})})()" }); console.log('tail', w.result.value); }
  if (process.env.OBM) { const w = await send('Runtime.evaluate', { returnByValue: true, expression: "(()=>{const a=document.querySelector('.ob-actions');const n=document.getElementById('ob-next');const d=document.getElementById('ob-demo');const r=e=>{const b=e.getBoundingClientRect();return {l:Math.round(b.left),r:Math.round(b.right),w:Math.round(b.width)}};const ab=a.getBoundingClientRect();return JSON.stringify({vw:innerWidth,actions:r(a),centreOfGroup:Math.round((ab.left+ab.right)/2),next:r(n),demo:r(d),display:getComputedStyle(a).display,justify:getComputedStyle(a).justifyContent,parentPad:getComputedStyle(a.parentElement).paddingLeft})})()" }); console.log('obm', w.result.value); }
  if (process.env.MENUQ) { await send('Runtime.evaluate', { expression: "document.getElementById('tb-more').click()" }); await new Promise((r) => setTimeout(r, 500)); if (process.env.MENUSHOT) { const sh = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 120, width: 393, height: 260, scale: 1 } }); require('node:fs').writeFileSync(process.env.MENUSHOT, Buffer.from(sh.data, 'base64')); console.log('menushot saved', process.env.MENUSHOT); }  const w = await send('Runtime.evaluate', { returnByValue: true, expression: "(()=>{const d=document.getElementById('tb-drop').getBoundingClientRect();const i=document.getElementById('run-ingest').getBoundingClientRect();const so=document.getElementById('logout'),dm=document.getElementById('load-demo');const o=(so&&getComputedStyle(so).display!=='none'?so:dm).getBoundingClientRect();return JSON.stringify({dropRight:Math.round(d.right),ingest:{l:Math.round(i.left),r:Math.round(i.right),top:Math.round(i.top)},signout:{l:Math.round(o.left),r:Math.round(o.right),top:Math.round(o.top)},sameRow:Math.abs(i.top-o.top)<2,rightAligned:Math.round(d.right-o.right)<=14})})()" }); console.log('menuq', w.result.value); }
  if (process.env.DEMOVIS) { const w = await send('Runtime.evaluate', { returnByValue: true, expression: "(()=>{const d=document.getElementById('load-demo');const cs=getComputedStyle(d);return JSON.stringify({hiddenAttr:d.hidden,display:cs.display,visible:d.offsetParent!==null})})()" }); console.log('demovis', w.result.value); }
  if (process.env.MARKQ) { const w = await send('Runtime.evaluate', { returnByValue: true, expression: "(()=>{const e=document.querySelector('.hello-mark');const cs=getComputedStyle(e);return JSON.stringify({text:e.textContent,image:cs.backgroundImage.slice(0,90),fill:cs.webkitTextFillColor})})()" }); console.log('markq', w.result.value); }
  if (process.env.GAPQ) { const w = await send('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression: "(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));const cands=[document.scrollingElement,document.body,document.querySelector('main'),document.getElementById('view')];const sc=cands.find(e=>e&&e.scrollHeight>e.clientHeight+4)||document.scrollingElement;sc.scrollTo(0,sc.scrollHeight);await wait(500);const v=document.getElementById('view');const last=v.lastElementChild.getBoundingClientRect();const nav=document.querySelector('.rail');const nb=nav?nav.getBoundingClientRect():null;const ncs=nav?getComputedStyle(nav):null;const navVisible=!!(nav&&ncs.display!=='none'&&nb&&nb.height>0);return JSON.stringify({viewport:innerHeight,navVisible:!!navVisible,navHeight:navVisible?Math.round(nb.height):0,lastCardBottom:Math.round(last.bottom),gapToViewportBottom:Math.round(innerHeight-last.bottom),gapToNav:navVisible?Math.round(nb.top-last.bottom):null,mainPadBottom:getComputedStyle(document.querySelector('main')).paddingBottom,railDisplay:ncs?ncs.display:null,railPos:ncs?ncs.position:null,railRect:nb?{top:Math.round(nb.top),h:Math.round(nb.height)}:null})})()" }); console.log('gapq', w.result.value); }
  if (process.env.MENUSTATE) { const w = await send('Runtime.evaluate', { returnByValue: true, expression: "(()=>{const d=document.getElementById('load-demo'),o=document.getElementById('logout');const cs=e=>getComputedStyle(e).display;return JSON.stringify({authed:STATE.authed,demo:cs(d),signout:cs(o)})})()" }); console.log('menustate', w.result.value); }
  if (process.env.DEMOBTN) { const w = await send('Runtime.evaluate', { returnByValue: true, expression: "(()=>{const b=document.getElementById('ob-demo');return JSON.stringify({authed:STATE.authed,demoButton:!!b,visible:b?getComputedStyle(b).display:null})})()" }); console.log('demobtn', w.result.value); }
  const metrics = await send('Runtime.evaluate', { expression: "JSON.stringify({docW:document.documentElement.scrollWidth,winW:innerWidth})", returnByValue: true });
  console.log('metrics', metrics.result.value);
  console.log('saved', OUT);
  try { process.kill(-proc.pid); } catch (e) {}
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
