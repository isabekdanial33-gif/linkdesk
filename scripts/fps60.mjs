import fs from 'node:fs/promises';
let s=await fs.readFile('web/app.mjs','utf8');s=s.replace('maxFrameRate:30,minWidth','maxFrameRate:60,minWidth');await fs.writeFile('web/app.mjs',s);
for(const name of ['web/guide.html','README.md']){let t=await fs.readFile(name,'utf8');t=t.replaceAll('30 кадров/с','60 кадров/с');await fs.writeFile(name,t);}
const p=JSON.parse(await fs.readFile('package.json','utf8'));p.build.mac.identity='-';await fs.writeFile('package.json',JSON.stringify(p,null,2));
