import { required, setStatus } from './dom.js';
import { ensureAssetLink } from './html-links.js';

const LABELS={html:'HTML',css:'CSS',js:'JavaScript'};
export function setupImports(editors,{ onLoaded }) {
  const requests=new Map();
  async function load(name,url,{render=true}={}) {
    const parsed=new URL(url,window.location.href);
    if(!['https:','http:'].includes(parsed.protocol))throw new Error('Nur HTTP(S)-URLs werden unterstützt.');
    requests.get(name)?.abort();
    const controller=new AbortController();
    requests.set(name,controller);
    try {
      const response=await fetch(parsed.href,{signal:controller.signal});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const content=await response.text();
      editors.set(name,content);
      if (name === 'css' || name === 'js') {
        const oldHtml = editors.get('html');
        const newHtml = ensureAssetLink(oldHtml, name);
        if (oldHtml !== newHtml) editors.set('html', newHtml);
      }
      onLoaded(name,{render});
      setStatus(`${LABELS[name]}-Datei geladen: ${parsed.href}`);
      return true;
    } catch(e) {
      if(e.name==='AbortError')return false;
      setStatus(`Fehler beim Laden von ${LABELS[name]}: ${e.message}`);
      throw e;
    } finally {if(requests.get(name)===controller)requests.delete(name);}
  }
  const ids={html:'loadHtmlBtn',css:'loadCssBtn',js:'loadJsBtn'};
  for(const [name,id] of Object.entries(ids)){
    required(id).addEventListener('click',async()=>{
      const url=prompt(`Bitte die URL der ${LABELS[name]}-Datei eingeben:`);
      if(!url?.trim())return;
      try{await load(name,url.trim());}catch(e){console.error(e);}
    });
  }
  return {load};
}
