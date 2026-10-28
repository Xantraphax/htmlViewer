import { required, setStatus } from './dom.js';
import { createProjectZip, normalizeZipName } from './export.js';

// Hier dieselbe veröffentlichte Worker-URL eintragen wie bisher (ohne /upload).
const WORKER_URL = '';
const MAX_BYTES = 10 * 1024 * 1024;

export function setupCloudSave(editors) {
  const button = required('cloudSaveBtn');
  const dialog = required('cloudSaveDialog');
  const passInput = required('cloudPassword');
  const projectInput = required('cloudProjectName');
  const pathLabel = required('cloudFolderPath');
  const folderList = required('cloudFolderList');
  const fileList = required('cloudFileList');
  const back = required('cloudFolderBack');
  const create = required('cloudFolderCreate');
  const save = required('cloudFolderSave');
  const reload = required('cloudFolderReload');
  const cancel = required('cloudFolderCancel');
  let path = '', busy = false;
  const base = () => WORKER_URL.replace(/\/$/, '');

  async function api(route, {method='GET', body, password=passInput.value, headers={}}={}) {
    const response = await fetch(base()+route, {
      method, mode:'cors', credentials:'omit',
      headers: {Authorization: `Bearer ${password}`, ...headers}, body
    });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }
  function setBusy(value) {
    busy=value;
    for (const element of [back,create,save,reload,passInput,projectInput]) element.disabled=value;
  }
  function clearItems(el) { el.replaceChildren(); }
  function itemButton(text, onClick) {
    const b=document.createElement('button'); b.type='button'; b.className='cloud-folder-item'; b.textContent=text; b.addEventListener('click',onClick); return b;
  }
  async function loadFolder() {
    if (busy || !passInput.value) return;
    setBusy(true);
    try {
      const data=await api(`/folders?path=${encodeURIComponent(path)}`);
      pathLabel.textContent=`projects/${path}`;
      back.disabled=!path;
      clearItems(folderList); clearItems(fileList);
      for (const folder of data.folders) {
        const name=folder.slice(path.length).replace(/\/$/,'');
        folderList.append(itemButton(`📁 ${name}`,()=>{path=folder+'/';loadFolder();}));
      }
      for (const file of data.files) {
        const row=document.createElement('div');row.className='cloud-file-item';
        row.textContent=`📦 ${file.name} (${Math.ceil(file.size/1024)} KB)`;
        fileList.append(row);
      }
      if (!data.folders.length) folderList.textContent='Keine Unterordner vorhanden.';
      if (!data.files.length) fileList.textContent='Keine ZIP-Dateien in diesem Ordner.';
      setStatus('Cloud-Ordner geladen.');
    } catch(e) {setStatus(`Ordner konnten nicht geladen werden: ${e.message}`);}
    finally {setBusy(false);back.disabled=!path;}
  }
  button.addEventListener('click',()=>{
    if (!WORKER_URL) {setStatus('Worker-URL in js/cloud-save.js eintragen.');return;}
    path='';pathLabel.textContent='projects/';
    projectInput.value='html-projekt';passInput.value='';
    folderList.textContent='Passwort eingeben und „Ordner anzeigen“ auswählen.';
    fileList.replaceChildren();dialog.showModal();
  });
  cancel.addEventListener('click',()=>{if(!busy)dialog.close();});
  dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  reload.addEventListener('click',loadFolder);
  passInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();loadFolder();}});
  back.addEventListener('click',()=>{
    if(!path)return;
    const segments=path.replace(/\/$/,'').split('/');segments.pop();
    path=segments.length?segments.join('/')+'/':'';loadFolder();
  });
  create.addEventListener('click',async()=>{
    if(busy||!passInput.value){setStatus('Bitte zuerst das Upload-Passwort eingeben.');return;}
    const name=prompt('Name des neuen Unterordners:');
    if(name===null)return;
    if(!/^[\p{L}\p{N} _.-]{1,80}$/u.test(name)||name==='.'||name==='..') {setStatus('Ungültiger Ordnername.');return;}
    setBusy(true);
    try {
      await api('/folders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path,name})});
      setStatus(`Unterordner „${name}“ erstellt.`);
    } catch(e) {setStatus(`Ordner konnte nicht angelegt werden: ${e.message}`);}
    finally {setBusy(false);}
    await loadFolder();
  });
  save.addEventListener('click',async()=>{
    if(busy)return;
    if(!passInput.value){setStatus('Bitte Upload-Passwort eingeben.');return;}
    const filename=normalizeZipName(projectInput.value);
    if(!filename){setStatus('Bitte einen Projektnamen eingeben.');return;}
    setBusy(true);
    try {
      setStatus('ZIP wird erstellt …');
      const blob=await createProjectZip(editors);
      if(blob.size>MAX_BYTES)throw new Error('Maximal 10 MB pro ZIP.');
      setStatus(`Speichere ZIP in projects/${path} …`);
      const data=await api('/upload',{method:'POST',headers:{'Content-Type':'application/zip','X-Project-Name':filename,'X-Project-Folder':path.replace(/\/$/,'')},body:blob});
      setStatus(`Projekt in projects/${path} gespeichert.`);
      dialog.close();
      if(confirm(`Gespeichert!\n\n${data.url}\n\nLink kopieren?`)) {
        try { await navigator.clipboard.writeText(data.url); }
        catch { prompt('Link zum Kopieren:',data.url); }
      }
    } catch(e){console.error('Cloud-Speichern fehlgeschlagen',e);setStatus(`Cloud-Speichern fehlgeschlagen: ${e.message}`);}
    finally {setBusy(false);}
  });
}
