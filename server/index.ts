import { createClient } from 'npm:@supabase/supabase-js@2.99.3';
const secret = Deno.env.get('SUPABASE_SECRET_KEYS');
const db=createClient(Deno.env.get('SUPABASE_URL')!,secret ? JSON.parse(secret).default : Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, authorization, apikey','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
const sha=async(s:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
const valid=(s:unknown,n=64)=>typeof s==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(s);
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
async function rate(bucket:string,maximum:number,seconds:number){const {data,error}=await db.rpc('linkdesk_rate',{bucket,maximum,seconds});if(error)throw Error('rate');return data===true;}
async function checked(q:any){const r=await q;if(r.error)throw Error('database');return r.data;}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('',{headers:cors});
 if(req.method!=='POST')return reply({error:'POST required'},405);
 try{
  if(Number(req.headers.get('content-length')||0)>600000)return reply({error:'Too large'},413);
  const reader=req.body?.getReader();let size=0;const chunks:Uint8Array[]=[];
  if(!reader)return reply({error:'Empty body'},400);
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>600000){await reader.cancel();return reply({error:'Too large'},413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  const b=JSON.parse(new TextDecoder().decode(bytes));
  if(!valid(b.id,32))return reply({error:'Некорректный код подключения'},400);
  const ip=await sha((req.headers.get('x-forwarded-for')||'unknown').split(',')[0]+new Date().toISOString().slice(0,10));
  if(b.action==='create'){
   if(!valid(b.hostToken)||!valid(b.joinHash))return reply({error:'Invalid credentials'},400);
   if(!await rate('create:'+ip,15,3600))return reply({error:'Слишком много подключений. Повторите позже.'},429);
   await checked(db.from('linkdesk_rooms').delete().lt('expires_at',new Date().toISOString()));
   await checked(db.from('linkdesk_limits').delete().lt('expires_at',new Date(Date.now()-86400000).toISOString()));
   const total=await db.from('linkdesk_rooms').select('id',{count:'exact',head:true});if(total.error)throw Error('count');
   if((total.count||0)>=500)return reply({error:'Сервис занят'},503);
   const {error}=await db.from('linkdesk_rooms').insert({id:b.id,host_hash:await sha(b.hostToken),join_hash:b.joinHash});
   return error?reply({error:'Не удалось создать сеанс'},409):reply({ok:true});
  }
  if(!await rate('access:'+ip,900,60))return reply({error:'Слишком много запросов'},429);
  if(b.action==='join'&&!await rate('join:'+ip,30,600))return reply({error:'Слишком много попыток'},429);
  const room=await checked(db.from('linkdesk_rooms').select('*').eq('id',b.id).gt('expires_at',new Date().toISOString()).maybeSingle());
  if(!room)return reply({error:'Сеанс закрыт или код неверный'},404);
  if(b.action==='join'){
   if(!valid(b.auth)||!valid(b.guestToken)||await sha(b.auth)!==room.join_hash)return reply({error:'Неверный пароль'},403);
   const hash=await sha(b.guestToken);
   if(room.guest_hash===hash)return reply({ok:true});
   if(room.joined)return reply({error:'К этому сеансу уже подключились. Создайте новый код.'},409);
   const rows=await checked(db.from('linkdesk_rooms').update({joined:true,guest_hash:hash}).eq('id',b.id).eq('joined',false).select('id'));
   return rows.length?reply({ok:true}):reply({error:'Сеанс занят'},409);
  }
  if(!['host','guest'].includes(b.role)||!valid(b.token))return reply({error:'Unauthorized'},401);
  if(await sha(b.token)!==(b.role==='host'?room.host_hash:room.guest_hash))return reply({error:'Unauthorized'},401);
  if(b.action==='close'){await checked(db.from('linkdesk_rooms').delete().eq('id',b.id));return reply({ok:true});}
  if(b.action==='approve'&&b.role==='host'){await checked(db.from('linkdesk_rooms').update({approved:true}).eq('id',b.id));return reply({ok:true});}
  if(b.action==='sync'){
   if(!await rate('room:'+b.id+':'+b.role,180,60))return reply({error:'Slow down'},429);
   if(b.frame!==undefined){if(b.role!=='host'||!room.approved||typeof b.frame!=='string'||b.frame.length>550000)return reply({error:'Invalid frame'},400);await checked(db.from('linkdesk_rooms').update({frame:b.frame,frame_at:new Date().toISOString()}).eq('id',b.id));}
   if(b.messages!==undefined){if(!Array.isArray(b.messages)||b.messages.length>12||b.messages.some((m:any)=>typeof m!=='string'||m.length>59000))return reply({error:'Invalid messages'},400);if(b.messages.length)await checked(db.from('linkdesk_messages').insert(b.messages.map((payload:string)=>({room_id:b.id,sender:b.role,payload}))));}
   const since=Number(b.since);if(!Number.isSafeInteger(since)||since<0)return reply({error:'Invalid cursor'},400);
   const messages=await checked(db.from('linkdesk_messages').select('id,payload').eq('room_id',b.id).neq('sender',b.role).gt('id',since).order('id').limit(100));
   await checked(db.from('linkdesk_messages').delete().eq('room_id',b.id).lt('created_at',new Date(Date.now()-120000).toISOString()));
   return reply({joined:room.joined,approved:room.approved,messages,expiresAt:room.expires_at,...(b.role==='guest'&&room.approved&&room.frame_at!==b.frameAt?{frame:room.frame,frameAt:room.frame_at}:{})});
  }
  return reply({error:'Unknown action'},400);
 }catch(e){console.error('linkdesk:',e instanceof SyntaxError?'bad-json':'request-failed');return reply({error:'Не удалось обработать запрос'},e instanceof SyntaxError?400:500);}
});
