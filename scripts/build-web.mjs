import fs from 'node:fs/promises';import path from 'node:path';import {build} from 'esbuild';import sharp from 'sharp';
await fs.mkdir('web/vendor',{recursive:true});await build({stdin:{contents:"import QRCode from 'qrcode'; window.QRCode=QRCode;",resolveDir:process.cwd()},bundle:true,minify:true,outfile:'web/vendor/qrcode.js'});
for(const size of [192,512])await sharp('web/icon.svg').resize(size,size).png().toFile(`web/icon-${size}.png`);
await fs.mkdir('android/app/src/main/res/drawable',{recursive:true});await sharp('web/icon.svg').resize(192,192).png().toFile('android/app/src/main/res/drawable/icon.png');
await sharp({create:{width:320,height:180,channels:4,background:'#183d2e'}}).composite([{input:await sharp('web/icon.svg').resize(150,150).png().toBuffer(),gravity:'center'}]).png().toFile('android/app/src/main/res/drawable/banner.png');
await fs.mkdir('android/app/src/main/assets',{recursive:true});await fs.cp('web','android/app/src/main/assets',{recursive:true});
for(const dir of ['dist/site','dist/ios']){await fs.mkdir(dir,{recursive:true});await fs.cp('web',dir,{recursive:true});await fs.writeFile(path.join(dir,'vercel.json'),JSON.stringify({cleanUrls:true,headers:[{source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'no-referrer'},{key:'X-Frame-Options',value:'DENY'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},{key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://tekynylmdmopjbhkboci.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"}]}]}));}
let installer=await fs.readFile('web/index.html','utf8');
installer=installer.replace(/<section id="connect"[\s\S]*?<section id="ios-note"/, '<section id="ios-note"');
installer=installer.replace(/<dialog id="session"[\s\S]*<script src="\.\/config.js">/, '<script src="./config.js">');
installer=installer.replace('<script src="./vendor/qrcode.js"></script>','').replace('src="./app.mjs"','src="./installer.mjs"');
installer=installer.replace('href="#connect">Подключиться','href="#downloads">Скачать').replace('Установите LinkDesk, чтобы передавать экран и разрешать управление.','');
await fs.writeFile('dist/site/index.html',installer);
for(const name of ['app.mjs','immersive.mjs','crypto.mjs','sw.js'])await fs.rm('dist/site/'+name,{force:true});
console.log('Installer-only website, iOS PWA and native assets built.');
