const enc = new TextEncoder(), dec = new TextDecoder();
export const hex = b => Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
export const random = (n=16) => hex(crypto.getRandomValues(new Uint8Array(n)));
export const sha = async s => hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
export function b64(a) { let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s); }
export const unb64 = s => Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export async function keys(id,password) {
 const base=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode('LinkDesk/v1/'+id),iterations:210000,hash:'SHA-256'},base,512);
 const bytes=new Uint8Array(bits);
 return {auth:hex(bytes.slice(0,32)),key:await crypto.subtle.importKey('raw',bytes.slice(32),'AES-GCM',false,['encrypt','decrypt'])};
}
export async function seal(key,value,context) {
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(context)},key,enc.encode(JSON.stringify(value))));
 return b64(iv)+'.'+b64(data);
}
export async function unseal(key,value,context) {
 if(typeof value!=='string'||value.length>600000)throw Error('Некорректный пакет');
 const [iv,data]=value.split('.');
 return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv),additionalData:enc.encode(context)},key,unb64(data))));
}
