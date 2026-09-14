import fs from 'node:fs/promises';
async function edit(file,pairs){let text=await fs.readFile(file,'utf8');for(const [from,to]of pairs){if(!text.includes(from))throw Error('Missing '+file+': '+from.slice(0,40));text=text.replace(from,to);}await fs.writeFile(file,text);}
await edit('web/app.mjs',[
 ["s.approved&&s.role==='guest'&&Date.now()-s.lastPeer>15000", "s.approved&&Date.now()-s.lastPeer>20000"],
 ["s.approved=true;s.control=", "s.approved=true;s.lastPeer=Date.now();s.control="],
 ["fast?180:1000", "fast?100:1000"],
 ["if('serviceWorker'in navigator", "if(!native&&'serviceWorker'in navigator"]
]);
await edit('desktop/main.cjs',[
 ["if(!robot)throw Error('Модуль мыши и клавиатуры не загрузился');if(process.platform==='darwin'&&!systemPreferences.isTrustedAccessibilityClient(true))throw Error('Включите LinkDesk в Универсальном доступе и повторите подключение.');", ""],
 ["allowControl=r.response===2;selected=display;", "allowControl=r.response===2;if(allowControl&&!robot)throw Error('Модуль управления не загрузился');if(allowControl&&process.platform==='darwin'&&!systemPreferences.isTrustedAccessibilityClient(true))throw Error('Включите LinkDesk в Универсальном доступе и повторите подключение.');selected=display;"]
]);
await edit('android/app/src/main/AndroidManifest.xml',[["android:name=\".MainActivity\"", "android:name=\".MainActivity\" android:launchMode=\"singleTask\""]]);
await edit('android/app/src/main/java/app/linkdesk/MainActivity.java',[
 ['if(ControlService.instance==null){reply(id,null,"Сначала включите службу LinkDesk в Специальных возможностях.");break;}', ''],
 ['.setPositiveButton("Разрешить",(d,w)->{approvalId=requestId;', '.setNeutralButton("Только наблюдение",(d,w)->{CaptureService.allowControl=false;approvalId=requestId;MediaProjectionManager m=(MediaProjectionManager)getSystemService(MEDIA_PROJECTION_SERVICE);startActivityForResult(m.createScreenCaptureIntent(),42);}).setPositiveButton("Управление",(d,w)->{if(ControlService.instance==null){reply(requestId,null,"Сначала включите службу LinkDesk в Специальных возможностях.");return;}CaptureService.allowControl=true;approvalId=requestId;'],
 ['if(CaptureService.active)reply(id,true,null);', 'if(CaptureService.active){try{reply(id,new JSONObject().put("control",CaptureService.allowControl),null);}catch(Exception e){reply(id,null,e.getMessage());}}']
]);
await edit('android/app/src/main/java/app/linkdesk/CaptureService.java',[
 ['public static volatile boolean active=false;', 'public static volatile boolean active=false,allowControl=false;'],
 ['System.currentTimeMillis()-last<180', 'System.currentTimeMillis()-last<90'],
 ['.put("height",height);', '.put("height",height).put("editable",ControlService.instance!=null&&ControlService.instance.editable());'],
 ['public void onDestroy(){active=false;', 'public void onDestroy(){active=false;allowControl=false;']
]);
await edit('android/app/src/main/java/app/linkdesk/ControlService.java',[
 ['public void input(JSONObject v)throws JSONException{if(!CaptureService.active', 'public boolean editable(){AccessibilityNodeInfo root=getRootInActiveWindow(),node=root==null?null:root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);return node!=null&&node.isEditable();}\n public void input(JSONObject v)throws JSONException{if(!CaptureService.allowControl||!CaptureService.active']
]);
await edit('tests/desktop-smoke.mjs',[["channel:'chrome'","channel:'msedge'"]]);
await edit('web/guide.html',[
 ['<h2 id="controls">Удобное управление</h2>', '<h2 id="controls">Удобное управление</h2><p>На телефонах и компьютерах используется Mix: вы видите весь экран и касаетесь нужного места. Постоянная панель команд скрыта. Два пальца прокручивают содержимое, долгое касание вызывает правый клик, двойное касание поля открывает родную клавиатуру телефона. На Android обнаруживается фокус редактируемого поля; на iPhone для клавиатуры иногда нужно повторное касание. Через меню ⋯ доступны точный трекпад и режим только наблюдения.</p><p>Только у телевизора есть переключатель «Наблюдение / Только пульт / Mix». В Mix изображение сохраняет пропорции и полностью помещается в своей области. На узком экране пульт расположен снизу, на широком — справа. Пульт прокручивается отдельно; изображение телевизора не обрезается. Команды передаются через интернет, а не инфракрасный свет.</p>'],
 ['Поле внизу и «Отправить»', 'Дважды коснуться поля на экране; запасной способ — ⋯ → «Открыть клавиатуру»'],
 ['Панель Enter, Esc, Tab, ⌫, ⌘/Ctrl, переключение окон; физическая клавиатура работает при фокусе на удалённом экране', 'Родная клавиатура телефона; физическая клавиатура работает при фокусе на удалённом экране'],
 ['«Быстрее» снижает разрешение; «Чётче» увеличивает его на Windows и Mac. На Android пока фиксированное качество', 'Windows/Mac пытаются передавать видео до 30 кадров/с напрямую. Резерв: JPEG, на Android напрямую до 10 кадров/с, через сервер около одного кадра/с. Частота зависит от сети и устройства'],
 ['Зашифрованные сообщения', 'Зашифрованные сообщения']
]);
