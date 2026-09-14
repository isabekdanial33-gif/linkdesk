const {contextBridge,ipcRenderer}=require('electron');
const api={};for(const name of ['info','permissions','approve','heartbeat','stop','capture','input','editable','source','copy'])api[name]=(...args)=>ipcRenderer.invoke('linkdesk:'+name,...args);
contextBridge.exposeInMainWorld('linkdesk',api);
ipcRenderer.on('stopped',()=>window.dispatchEvent(new Event('linkdesk-native-stopped')));
