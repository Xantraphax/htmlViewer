import { required } from './dom.js';
export function setupResize() {
  const divider=required('divider'), editor=required('editor');
  let pointerId=null, frame=0, x=0;
  const update=()=>{
    frame=0;
    const container=editor.parentElement;
    const left=container.getBoundingClientRect().left;
    const max=Math.max(150,container.clientWidth-150);
    editor.style.width=`${Math.min(max,Math.max(150,x-left))}px`;
  };
  divider.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    pointerId=e.pointerId;
    divider.setPointerCapture(e.pointerId);
    document.body.style.cursor='col-resize';
  });
  divider.addEventListener('pointermove',e=>{
    if(pointerId!==e.pointerId)return;
    x=e.clientX;
    if(!frame)frame=requestAnimationFrame(update);
  });
  function stop(e){
    if(pointerId!==e.pointerId)return;
    pointerId=null;
    document.body.style.cursor='';
    if(divider.hasPointerCapture(e.pointerId))divider.releasePointerCapture(e.pointerId);
  }
  divider.addEventListener('pointerup',stop);
  divider.addEventListener('pointercancel',stop);
  divider.addEventListener('lostpointercapture',()=>{pointerId=null;document.body.style.cursor='';});
}
