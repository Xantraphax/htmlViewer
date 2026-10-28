import { required, setStatus } from './dom.js';
import { WORKER_URL } from './cloud-config.js';

export function setupCloudDelete() {
  const button = required('cloudDeleteBtn');
  const dialog = required('cloudDeleteDialog');
  const password = required('cloudDeletePassword');
  const reload = required('cloudDeleteReload');
  const back = required('cloudDeleteBack');
  const folders = required('cloudDeleteFolders');
  const files = required('cloudDeleteFiles');
  const pathLabel = required('cloudDeletePath');
  const chosenLabel = required('cloudDeleteSelected');
  const remove = required('cloudDeleteConfirm');
  const cancel = required('cloudDeleteCancel');
  let path = '';
  let selected = null;
  let busy = false;

  async function api(route, { method = 'GET', data } = {}) {
    const response = await fetch(WORKER_URL.replace(/\/$/, '') + route, {
      method,
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${password.value}`,
        ...(data ? { 'Content-Type': 'application/json' } : {})
      },
      ...(data ? { body: JSON.stringify(data) } : {})
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    return result;
  }

  function setBusy(value) {
    busy = value;
    for (const control of [password, reload, back, remove, cancel]) control.disabled = value;
    if (!value) {
      back.disabled = !path;
      remove.disabled = !selected;
    }
    for (const control of dialog.querySelectorAll('.cloud-delete-entry button')) control.disabled = value;
  }

  function clearSelection() {
    selected = null;
    chosenLabel.textContent = 'Nichts ausgewählt.';
    remove.disabled = true;
    dialog.querySelectorAll('.cloud-delete-select').forEach(b => b.setAttribute('aria-pressed', 'false'));
  }

  function row(container, label, target, openFolder) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cloud-delete-entry';
    const main = document.createElement(openFolder ? 'button' : 'span');
    if (openFolder) {
      main.type = 'button';
      main.className = 'cloud-folder-item';
      main.addEventListener('click', openFolder);
      main.title = 'Ordner öffnen';
    } else {
      main.className = 'cloud-file-item';
    }
    main.textContent = label;
    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'cloud-delete-select';
    select.textContent = 'Löschen';
    select.title = `${label} zum Löschen auswählen`;
    select.setAttribute('aria-pressed', 'false');
    select.addEventListener('click', () => {
      clearSelection();
      selected = target;
      chosenLabel.textContent = `Zum Löschen ausgewählt: ${label}`;
      select.setAttribute('aria-pressed', 'true');
      remove.disabled = false;
    });
    wrapper.append(main, select);
    container.append(wrapper);
  }

  async function showFolder() {
    if (busy) return;
    if (!password.value) { setStatus('Bitte Cloud-Passwort eingeben.'); return; }
    setBusy(true);
    clearSelection();
    folders.replaceChildren();
    files.replaceChildren();
    try {
      const data = await api(`/folders?path=${encodeURIComponent(path)}`);
      pathLabel.textContent = `projects/${path}`;
      for (const folder of data.folders || []) {
        const name = folder.slice(path.length).replace(/\/$/, '');
        row(folders, `📁 ${name}`, {type:'folder',path:folder}, () => {
          path = `${folder}/`;
          showFolder();
        });
      }
      for (const file of data.files || []) {
        if (!file.name?.toLowerCase().endsWith('.zip')) continue;
        row(files, `📦 ${file.name}`, {type:'file',key:file.key});
      }
      if (!folders.children.length) folders.textContent = 'Keine Unterordner vorhanden.';
      if (!files.children.length) files.textContent = 'Keine ZIP-Dateien vorhanden.';
      setStatus('Cloud-Ordner geladen.');
    } catch (error) {
      setStatus(`Cloud-Löschen: ${error.message}`);
    } finally { setBusy(false); }
  }

  button.addEventListener('click', () => {
    if (!WORKER_URL) { setStatus('Bitte Worker-URL in js/cloud-config.js hinterlegen.'); return; }
    path = '';
    password.value = '';
    pathLabel.textContent = 'projects/';
    folders.textContent = 'Passwort eingeben und „Ordner anzeigen“ wählen.';
    files.replaceChildren();
    clearSelection();
    dialog.showModal();
  });
  reload.addEventListener('click', showFolder);
  password.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); showFolder(); }
  });
  back.addEventListener('click', () => {
    if (!path || busy) return;
    const parts = path.replace(/\/$/,'').split('/');
    parts.pop();
    path = parts.length ? `${parts.join('/')}/` : '';
    showFolder();
  });
  cancel.addEventListener('click', () => { if (!busy) dialog.close(); });
  dialog.addEventListener('cancel', e => { if (busy) e.preventDefault(); });

  remove.addEventListener('click', async () => {
    if (busy || !selected) return;
    const target = { ...selected };
    const name = (target.type === 'folder' ? target.path : target.key).split('/').filter(Boolean).pop();
    if (target.type === 'folder') {
      const value = prompt(`ACHTUNG: Der Ordner „${name}“ und ALLE darin enthaltenen Dateien und Unterordner werden unwiderruflich gelöscht.\n\nGib zur Bestätigung den Ordnernamen ein:`, '');
      if (value !== name) { setStatus('Löschen abgebrochen: Ordnername stimmt nicht überein.'); return; }
    } else if (!confirm(`ZIP-Datei „${name}“ wirklich dauerhaft löschen?`)) {
      return;
    }
    setBusy(true);
    try {
      const result = await api('/delete', {method:'POST',data:target});
      setStatus(`${name} gelöscht (${result.deleted} Objekt${result.deleted === 1 ? '' : 'e'}).`);
    } catch(error) {
      setStatus(`Löschen fehlgeschlagen: ${error.message}`);
    } finally {
      setBusy(false);
      await showFolder();
    }
  });
}
