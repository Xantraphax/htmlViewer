import { required, setStatus } from './dom.js';
import { readSetting,writeSetting,debounce } from './storage.js';
import { createEditors } from './editors.js';
import { setupTabs } from './tabs.js';
import { setupPreview } from './preview.js';
import { setupConsoleOverlay } from './console-overlay.js';
import { setupResize } from './resize.js';
import { setupImports } from './imports.js';
import { setupExport } from './export.js';

function init() {
  const auto=required('autoRenderToggle');
  auto.checked=readSetting('autorender')==='true';
  let preview,tabs;
  const scheduleRender=debounce(()=>preview.render(),300);
  const editors=createEditors({onChange(name){
    if(name==='html')tabs?.sync(editors.get('html'));
    if(auto.checked) scheduleRender();
  }});
  tabs=setupTabs(editors);
  const overlay=setupConsoleOverlay();
  preview=setupPreview(editors,overlay);
  setupResize();
  setupExport(editors);
  const imports=setupImports(editors,{onLoaded(name,{render}) {
    tabs.sync(editors.get('html'));
    if(render)preview.render();
  }});
  required('renderBtn').addEventListener('click',()=>preview.render());
  auto.addEventListener('change',()=>{
    writeSetting('autorender',auto.checked);
    setStatus(auto.checked?'Auto-Render aktiviert':'Auto-Render deaktiviert');
    if(auto.checked)preview.render();
  });
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){
      e.preventDefault();preview.render();
    }
  });
  async function initializeUrl() {
    const params=new URLSearchParams(location.search);
    const enabled=params.get('autorender');
    if(enabled==='1'||enabled==='0'){
      auto.checked=enabled==='1';
      writeSetting('autorender',auto.checked);
    }
    const menu=params.get('menu');
    if(menu==='0'||menu==='1')document.getElementById('controls')?.classList.toggle('hidden',menu==='0');
    for(const name of ['html','css','js']){
      const url=params.get(name);
      if(!url)continue;
      try {await imports.load(name,url,{render:false});}
      catch(e){console.error(`Fehler beim ${name.toUpperCase()}-Import`,e);}
    }
    tabs.sync(editors.get('html'));
    preview.render();
  }
  initializeUrl().catch(e=>setStatus(`Initialisierungsfehler: ${e.message}`));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
