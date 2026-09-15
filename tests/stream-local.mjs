import {_electron as electron,chromium} from 'playwright';import path from 'node:path';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const app=await electron.launch({args:[process.cwd()],executablePath:path.resolve('node_modules/electron/dist/electron.exe'),env});
const host=await app.firstWindow();await app.evaluate(({BrowserWindow,dialog})=>{const w=BrowserWindow.getAllWindows()[0];w.hide();w.show=()=>{};w.focus=()=>{};dialog.showMessageBox=async()=>({response:1});});
const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
try{
 const guest=await browser.newPage();for(const p of [host,guest])p.on('pageerror',e=>errors.push(e.message));
 await guest.route('https://linkdesk-ios.vercel.app/**',async route=>{const u=new URL(route.request().url());const file=path.resolve('dist/ios','.'+(u.pathname==='/'?'/index.html':u.pathname));const ext=path.extname(file);try{await route.fulfill({body:await fs.readFile(file),contentType:({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'})[ext]||'application/json'});}catch{await route.abort();}});
 await guest.goto('https://linkdesk-ios.vercel.app');await host.waitForSelector('#host-native:not([hidden])');
 await host.click('#host-button');await host.waitForSelector('#host-details:not([hidden])');await guest.fill('#room-input',await host.locator('#host-id').textContent());await guest.fill('#password-input',await host.locator('#host-password').textContent());await guest.click('#connect-button');
 await guest.waitForFunction(()=>document.querySelector('#remote-video').videoWidth>0,{},{timeout:45000});
 const capture=await host.evaluate(async()=>{const s=(await import('./app.mjs')).getSession();return s.stream?.getTracks().map(t=>({kind:t.kind,settings:t.getSettings()}));});
 console.log('CAPTURE',capture);assert(capture.some(t=>t.kind==='video'&&t.settings.frameRate===60));assert(capture.some(t=>t.kind==='audio'));
 await guest.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Включить звук'&&!b.hidden));await guest.getByRole('button',{name:'Включить звук',exact:true}).click();
 await guest.waitForTimeout(3000);console.log('RECEIVER',await guest.evaluate(async()=>{const s=(await import('./app.mjs')).getSession(),stats=await s.pc.getStats();return [...stats.values()].filter(r=>r.type==='inbound-rtp').map(r=>({kind:r.kind,bytes:r.bytesReceived,frames:r.framesDecoded,fps:r.framesPerSecond}));}));
 assert.deepEqual(errors,[]);await guest.click('#disconnect');console.log('PASS real Windows screen + audio tracks, WebRTC guest, no JavaScript errors');
}finally{await app.close();await browser.close();}
