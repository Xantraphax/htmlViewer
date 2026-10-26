import { required, setStatus } from './dom.js';
import { isLocalFile } from './tabs.js';

const EMPTY='<!doctype html><html><head><meta charset="utf-8"><title>Leer</title></head><body><p>Kein Inhalt.</p></body></html>';
const validTypes=new Set(['log','error','warn','info']);
function inlineSafe(code) { return code.replace(/<\/script/gi,'<\\/script').replace(/<!--/g,'<\\!--'); }
function bridge(token) {
  return `(function(){
    const token=${JSON.stringify(token)};
    function send(type,args){try{parent.postMessage({channel:'viewer-console',token,type,msg:args.map(v=>{try{return typeof v==='string'?v:JSON.stringify(v)??String(v)}catch{return String(v)}}).join(' ')},'*')}catch{}}
    for(const type of ['log','error','warn','info']){
      const original=console[type].bind(console);
      console[type]=(...args)=>{send(type,args);original(...args)};
    }
    addEventListener('error',e=>send('error',[e.message+' at '+e.filename+':'+e.lineno+':'+e.colno]));
    addEventListener('unhandledrejection',e=>send('error',['Unhandled Promise:',e.reason]));
  })();`;
}
export function setupPreview(editors, overlay) {
  const frame=required('preview');
  // Ohne allow-same-origin hat srcdoc eine isolierte (opaque) Origin.
  frame.setAttribute('sandbox','allow-scripts allow-modals');
  let token='';
  window.addEventListener('message',e=>{
    if(e.source!==frame.contentWindow || !e.data || typeof e.data!=='object')return;
    const {channel,token:received,type,msg}=e.data;
    if(channel!=='viewer-console'||received!==token||!validTypes.has(type)||typeof msg!=='string')return;
    overlay.show(msg.slice(0,10000),type);
  });
  function render() {
    const html=editors.get('html')||EMPTY;
    const doc=new DOMParser().parseFromString(html,'text/html');
    const css=editors.get('css'),js=editors.get('js');
    token=crypto.randomUUID();
    overlay.beginRender();
    // Console-Bootstrap MUSS vor Benutzerskripten stehen.
    const consoleScript=doc.createElement('script');
    consoleScript.textContent=inlineSafe(bridge(token));
    doc.head.insertBefore(consoleScript,doc.head.firstChild);
    for(const link of [...doc.querySelectorAll('link[rel~="stylesheet"][href]')]){
      if(!isLocalFile(link.getAttribute('href'),'styles.css'))continue;
      const style=doc.createElement('style');
      style.textContent=css;
      link.replaceWith(style);
    }
    for(const script of [...doc.querySelectorAll('script[src]')]){
      if(!isLocalFile(script.getAttribute('src'),'script.js'))continue;
      const replacement=doc.createElement('script');
      replacement.textContent=inlineSafe(js.replace(/\/\/[#@] sourceMappingURL=.*$/gm,''));
      script.replaceWith(replacement);
    }
    frame.srcdoc='<!doctype html>\n'+doc.documentElement.outerHTML;
    setStatus('Gerendert');
  }
  return {render};
}
