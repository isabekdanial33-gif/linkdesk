import fs from 'node:fs/promises';
async function edit(file,pairs){let text=await fs.readFile(file,'utf8');for(const [from,to]of pairs){if(!text.includes(from))throw Error('Missing '+file+': '+from.slice(0,60));text=text.replace(from,to);}await fs.writeFile(file,text);}
await edit('web/app.mjs',[
 ['function input(event){send(', 'export function input(event){if(state?.remoteInfo?.control===false)return;send('],
 ["function point(e){const img=$('#remote-screen'),r=img.getBoundingClientRect();", "function point(e){const img=$('#remote-screen'),r=img.getBoundingClientRect();"],
 ["const viewport=$('#viewport');", "const viewport=$('#viewport');\nexport const getSession=()=>state;\n"],
 ["viewport.addEventListener('pointerdown'", "/* Legacy pointer implementation replaced by immersive.mjs\nviewport.addEventListener('pointerdown'"],
 ["const keyMap=", "*/\nconst keyMap="],
 ["s.pc?.close();clearTimeout(s.frameTimer)", "s.pc?.close();s.stream?.getTracks().forEach(t=>t.stop());$('#remote-video').srcObject=null;$('#remote-video').hidden=true;$('#remote-screen').hidden=false;$('#viewport').hidden=false;$('#session').classList.remove('tv-session');clearTimeout(s.frameTimer)"],
 ["s.approved=true;await api('approve',{},s);await queue({type:'approved',info,sas},s);", "s.approved=true;s.control=approved.control!==false;await api('approve',{},s);await queue({type:'approved',info:{...info,control:s.control},sas},s);if(info.platform!=='android'){try{s.stream=await navigator.mediaDevices.getDisplayMedia({audio:false,video:{frameRate:30,width:1920,height:1080}});s.stream.getVideoTracks()[0].onended=()=>stop('Передача экрана остановлена');}catch{}}"],
 ["if(value.info.tv)makeTvRemote(value.info);", "if(value.info.tv)makeTvRemote(value.info);window.dispatchEvent(new CustomEvent('linkdesk-connected',{detail:value.info}));"],
 ["s.role==='host'&&s.approved){await native.input", "s.role==='host'&&s.approved&&s.control){await native.input"],
 ["const pc=s.pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});", "const pc=s.pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});if(s.stream)for(const track of s.stream.getTracks())pc.addTrack(track,s.stream);pc.ontrack=e=>{const video=$('#remote-video');video.srcObject=e.streams[0];video.hidden=false;$('#remote-screen').hidden=true;$('#screen-placeholder').hidden=true;video.play().catch(()=>{});};"],
 ["const fast=s.dc?.readyState==='open';try{", "const fast=s.dc?.readyState==='open';try{if(fast&&s.stream){await send({type:'ping',editable:await native.editable()});s.frameTimer=setTimeout(()=>frames(s),600);return;}"],
 ["else if(value.type==='ping'){if(s.role", "else if(value.type==='ping'){if(value.editable!==undefined)window.dispatchEvent(new CustomEvent('linkdesk-editable',{detail:value.editable}));if(s.role"],
 ["$('#remote-screen').src=v.data;$('#screen-placeholder').hidden=true;", "$('#remote-screen').src=v.data;window.dispatchEvent(new CustomEvent('linkdesk-editable',{detail:!!v.editable}));$('#screen-placeholder').hidden=true;"],
 ["$('#session').insertBefore(wrap,$('#viewport'));", "$('#session-workspace').append(wrap);$('#session').classList.add('tv-session');"],
 ["const toggle=document.createElement('button');toggle.className='secondary';toggle.textContent='Пульт / экран';toggle.addEventListener('click',()=>{wrap.hidden=!wrap.hidden;viewport.hidden=!wrap.hidden;});$('.session-bar>div:last-child').prepend(toggle);viewport.hidden=true;", "viewport.hidden=false;"],
 ["if('serviceWorker'in navigator", "await import('./immersive.mjs');\nif('serviceWorker'in navigator"]
]);
await edit('web/index.html',[
 ['<div id="viewport" tabindex="0"', '<div id="session-workspace"><div id="viewport" tabindex="0"'],
 ['<img id="remote-screen"', '<video id="remote-video" autoplay playsinline muted hidden></video><img id="remote-screen"'],
 ['<div class="session-controls">', '</div><div class="session-controls">'],
 ['<div><button id="fullscreen"', '<div><select id="tv-layout" aria-label="Режим телевизора" hidden><option value="mix">Mix: экран и пульт</option><option value="watch">Наблюдение</option><option value="remote">Только пульт</option></select><button id="session-options" class="secondary" aria-label="Настройки сеанса">⋯</button><button id="fullscreen"'],
 ['<script src="./config.js">', '<textarea id="native-keyboard" aria-label="Клавиатура удалённого устройства" autocapitalize="off" autocomplete="off" spellcheck="false" enterkeyhint="enter"></textarea><dialog id="options-dialog"><h2>Настройки сеанса</h2><label><input type="checkbox" id="watch-only"> Только наблюдать, без нажатий</label><label for="gesture-mode">Касания</label><select id="gesture-mode"><option value="direct">Прямое управление</option><option value="trackpad">Точный трекпад</option></select><p>Два пальца — прокрутка. Долгое нажатие — правый клик. Дважды коснитесь поля ввода для клавиатуры.</p><button id="open-keyboard" class="secondary">Открыть клавиатуру</button><button id="close-options" class="primary">Готово</button></dialog><script src="./config.js">'],
 ['На телефоне: касание — клик, движение — жест; режим трекпада двигает курсор. Esc освобождает клавиатуру. Для Android выберите весь экран и сохраняйте его ориентацию.', 'Касание — клик · Два пальца — прокрутка · Долгое касание — правый клик · Двойное касание поля — клавиатура']
]);
await edit('desktop/main.cjs',[
 ["let win,approved=false,selected", "let win,approved=false,allowControl=false,selected"],
 ["function stop(){approved=false;", "function stop(){approved=false;allowControl=false;"],
 ["async function input(v){gate();", "async function input(v){gate();if(!allowControl)return;"],
 ["win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));", "win.webContents.session.setPermissionRequestHandler((wc,permission,callback)=>callback(wc===win.webContents&&approved&&permission==='media'));win.webContents.session.setDisplayMediaRequestHandler(async(request,callback)=>{if(!approved||request.frame!==win.webContents.mainFrame){callback({});return;}try{const sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:0,height:0}});const source=sources.find(s=>s.display_id===selected);callback(approved&&source?{video:source}:{});}catch{callback({});}});"],
 ["buttons:['Отклонить','Разрешить этот сеанс']", "buttons:['Отклонить','Только наблюдение','Разрешить управление']"],
 ["if(r.response!==1)return false;selected=display;", "if(r.response===0)return false;allowControl=r.response===2;selected=display;"],
 ["ВКЛЮЧЕНО');return true;", "ВКЛЮЧЕНО');return {control:allowControl};"],
 ["handle('heartbeat',", "handle('editable',()=>false);\n handle('heartbeat',"]
]);
await edit('desktop/preload.cjs',[["'capture','input'","'capture','input','editable'"]]);
await edit('web/sw.js',[["'linkdesk-v1'","'linkdesk-v2'"],["'./app.mjs'","'./app.mjs','./immersive.mjs'"]]);
