import fs from 'node:fs/promises';
const source=await fs.readFile('scripts/final-fixes.mjs','utf8');
const prefix=source.slice(0,source.indexOf("await edit('web/app.mjs'"));
const suffix=source.slice(source.indexOf("await edit('web/guide.html'")).replace(",\n ['Зашифрованные сообщения', 'Зашифрованные сообщения']",'');
await fs.writeFile('../guide-fix.mjs',prefix+suffix);await import('../../guide-fix.mjs');
