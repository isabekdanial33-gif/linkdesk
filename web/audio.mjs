// Separate audio output keeps screen video autoplay reliable on iOS.
const output=document.createElement('audio');output.autoplay=true;
const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='Включить звук';button.title='Системный звук удалённого устройства';button.hidden=true;
document.querySelector('#session-options').before(button);document.querySelector('#session').append(output);
let context,next=0,enabled=false,available=false;
function label(){button.hidden=!available;button.textContent=enabled?'Звук: вкл.':'Включить звук';button.setAttribute('aria-pressed',String(enabled));}
button.onclick=async()=>{enabled=!enabled;output.muted=!enabled;if(enabled){context??=new AudioContext({latencyHint:'interactive'});await context.resume();if(output.srcObject)await output.play().catch(()=>{});}label();};
export function audioTrack(track){available=true;output.srcObject=new MediaStream([track]);output.muted=!enabled;label();}
export function pcmChannel(dc){available=true;label();dc.binaryType='arraybuffer';dc.onmessage=e=>{if(!enabled||context?.state!=='running'||!(e.data instanceof ArrayBuffer)||e.data.byteLength%2)return;const now=context.currentTime;if(next>now+.14){next=now+.04;return;}const data=new DataView(e.data),count=data.byteLength/2;if(count>4800)return;const buffer=context.createBuffer(1,count,48000),samples=buffer.getChannelData(0);for(let i=0;i<count;i++)samples[i]=data.getInt16(i*2,true)/32768;const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);next=Math.max(next,now+.025);source.start(next);next+=count/48000;};}
export function stopAudio(){output.pause();output.srcObject=null;context?.close().catch(()=>{});context=null;next=0;enabled=false;available=false;label();}
