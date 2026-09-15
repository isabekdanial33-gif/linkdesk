// At most one unsent move; presses, releases, typing retain their order.
export function inputBuffer(deliver,schedule=requestAnimationFrame,cancel=cancelAnimationFrame){
 let move=null,timer=null;
 const flush=()=>{if(timer!==null)cancel(timer);timer=null;if(move){const current=move;move=null;deliver(current);}};
 const push=e=>{if(e.type==='pointer'&&e.action==='move'){move=e;timer??=schedule(flush);}else{flush();deliver(e);}};
 push.clear=()=>{if(timer!==null)cancel(timer);move=null;timer=null;};return push;
}
