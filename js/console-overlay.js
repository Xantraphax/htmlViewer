import { required } from './dom.js';

export function setupConsoleOverlay() {
  const overlay=required('jsOverlay'), header=required('jsOverlayHeader'), content=required('jsOverlayContent');
  required('jsOverlayClose').addEventListener('click',()=>{overlay.style.display='none';});
  required('jsOverlayReset').addEventListener('click',()=>{content.replaceChildren();});
  let start=null;
  header.style.touchAction='none';
  header.addEventListener('pointerdown',e=>{
    if (e.button!==0) return;
    start={id:e.pointerId,x:e.clientX-overlay.offsetLeft,y:e.clientY-overlay.offsetTop};
    header.setPointerCapture(e.pointerId);
  });
  header.addEventListener('pointermove',e=>{
    if (!start||e.pointerId!==start.id) return;
    overlay.style.left=`${Math.max(0,Math.min(innerWidth-overlay.offsetWidth,e.clientX-start.x))}px`;
    overlay.style.top=`${Math.max(0,Math.min(innerHeight-overlay.offsetHeight,e.clientY-start.y))}px`;
  });
  function end(e) { if (start?.id===e.pointerId) start=null; }
  header.addEventListener('pointerup',end);
  header.addEventListener('pointercancel',end);
  let count=0;
  return {
    show(message,type='log') {
      overlay.style.display='block';
      const line=document.createElement('div');
      line.textContent=`[${type}] ${String(message)}`;
      content.appendChild(line);
      if (++count>500) {content.firstElementChild?.remove();count--;}
      content.scrollTop=content.scrollHeight;
    },
    clear() {content.replaceChildren();count=0;}
  };
}
