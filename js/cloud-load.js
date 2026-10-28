import { required, setStatus } from './dom.js';
import { importZipProject } from './import-zip.js';
import { WORKER_URL } from './cloud-config.js';

const MAX_BYTES = 10 * 1024 * 1024;

export function setupCloudLoad(editors, { onImported }) {
  const button = required('cloudLoadBtn');
  const dialog = required('cloudLoadDialog');
  const password = required('cloudLoadPassword');
  const reload = required('cloudLoadReload');
  const back = required('cloudLoadBack');
  const folderView = required('cloudLoadFolders');
  const fileView = required('cloudLoadFiles');
  const pathView = required('cloudLoadPath');
  const selectedView = required('cloudLoadSelected');
  const importButton = required('cloudLoadImport');
  const cancel = required('cloudLoadCancel');
  let path = '';
  let selected = null;
  let busy = false;

  async function request(route) {
    const response = await fetch(WORKER_URL.replace(/\/$/, '') + route, {
      headers: { Authorization: `Bearer ${password.value}` },
      mode: 'cors', credentials: 'omit', cache: 'no-store'
    });
    if (!response.ok) {
      const info = await response.json().catch(() => null);
      throw new Error(info?.error || `HTTP ${response.status}`);
    }
    return response;
  }
  function setBusy(value) {
    busy = value;
    for (const element of [password, reload, back, cancel, importButton]) element.disabled = value;
    if (!value) { back.disabled = !path; importButton.disabled = !selected; }
  }
  function clearSelection() {
    selected = null;
    selectedView.textContent = 'Noch keine ZIP-Datei ausgewählt.';
    importButton.disabled = true;
  }
  function addButton(parent, label, callback, extraClass = 'cloud-folder-item') {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = extraClass;
    element.textContent = label;
    element.addEventListener('click', callback);
    parent.append(element);
    return element;
  }
  async function showFolder() {
    if (busy) return;
    if (!password.value) { setStatus('Bitte Cloud-Passwort eingeben.'); return; }
    setBusy(true);
    clearSelection();
    folderView.replaceChildren(); fileView.replaceChildren();
    try {
      const response = await request(`/folders?path=${encodeURIComponent(path)}`);
      const data = await response.json();
      pathView.textContent = `projects/${path}`;
      for (const folder of data.folders || []) {
        const name = folder.slice(path.length).replace(/\/$/, '');
        addButton(folderView, `📁 ${name}`, () => {
          path = `${folder}/`;
          showFolder();
        });
      }
      for (const file of data.files || []) {
        if (!file.name?.toLowerCase().endsWith('.zip')) continue;
        const element = addButton(fileView, `📦 ${file.name} (${Math.ceil(file.size / 1024)} KB)`, () => {
          selected = { key: file.key, name: file.name };
          selectedView.textContent = `Ausgewählt: ${file.name}`;
          for (const sibling of fileView.querySelectorAll('button')) sibling.setAttribute('aria-pressed', String(sibling === element));
          importButton.disabled = false;
        }, 'cloud-file-choice');
        element.setAttribute('aria-pressed', 'false');
      }
      if (!folderView.children.length) folderView.textContent = 'Keine Unterordner vorhanden.';
      if (!fileView.children.length) fileView.textContent = 'Keine ZIP-Dateien in diesem Ordner.';
      setStatus('Cloud-Ordner geladen.');
    } catch (error) {
      setStatus(`Cloud-Ordner konnten nicht geladen werden: ${error.message}`);
    } finally { setBusy(false); }
  }

  button.addEventListener('click', () => {
    if (!WORKER_URL) { setStatus('Worker-URL in js/cloud-config.js eintragen.'); return; }
    path = '';
    password.value = '';
    pathView.textContent = 'projects/';
    folderView.textContent = 'Passwort eingeben und „Ordner anzeigen“ auswählen.';
    fileView.replaceChildren();
    clearSelection();
    dialog.showModal();
  });
  reload.addEventListener('click', showFolder);
  password.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); showFolder(); }
  });
  back.addEventListener('click', () => {
    if (!path || busy) return;
    const segments = path.replace(/\/$/, '').split('/');
    segments.pop();
    path = segments.length ? `${segments.join('/')}/` : '';
    showFolder();
  });
  cancel.addEventListener('click', () => { if (!busy) dialog.close(); });
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  importButton.addEventListener('click', async () => {
    if (busy || !selected) return;
    setBusy(true);
    try {
      setStatus(`Lade ${selected.name} aus der Cloud …`);
      const response = await request(`/download?key=${encodeURIComponent(selected.key)}`);
      const declared = Number(response.headers.get('Content-Length'));
      if (declared > MAX_BYTES) throw new Error('ZIP-Datei zu groß (max. 10 MB).');
      const blob = await response.blob();
      if (blob.size > MAX_BYTES) throw new Error('ZIP-Datei zu groß (max. 10 MB).');
      const imported = await importZipProject(blob, selected.name, editors, onImported);
      if (imported) dialog.close();
    } catch (error) {
      console.error('Cloud-Laden fehlgeschlagen:', error);
      setStatus(`Cloud-Laden fehlgeschlagen: ${error.message}`);
    } finally { setBusy(false); }
  });
}
