import { required, setStatus } from './dom.js';
import { ensureAssetLink } from './html-links.js';

const MAX_ARCHIVE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const NAMES = ['index.html', 'styles.css', 'script.js'];

/** Liest ein Projekt-ZIP und aktualisiert nach Bestätigung alle drei Editoren. */
export async function importZipProject(data, label, editors, onImported) {
  if (!window.JSZip) throw new Error('JSZip konnte nicht geladen werden.');
  if (data.size > MAX_ARCHIVE_BYTES) throw new Error('Das ZIP-Archiv ist zu groß (max. 10 MB).');

  let zip;
  try {
    zip = await window.JSZip.loadAsync(data);
  } catch {
    throw new Error('Die Antwort ist kein gültiges ZIP-Archiv. Verwende einen direkten Downloadlink auf eine ZIP-Datei.');
  }
  const content = {};
  for (const name of NAMES) {
    const entry = zip.file(name); // nur Dateien im Stammverzeichnis
    if (!entry || entry.dir) continue;
    if (entry._data?.uncompressedSize > MAX_TEXT_BYTES) {
      throw new Error(`${name} ist größer als 2 MB.`);
    }
    const text = await entry.async('string');
    if (new TextEncoder().encode(text).byteLength > MAX_TEXT_BYTES) {
      throw new Error(`${name} ist größer als 2 MB.`);
    }
    content[name] = text;
  }
  if (!Object.hasOwn(content, 'index.html')) {
    throw new Error('Im ZIP fehlt index.html im Stammverzeichnis.');
  }
  if (!window.confirm(`Projekt „${label}“ importieren? Die aktuellen Editorinhalte werden ersetzt.`)) {
    setStatus('ZIP-Import abgebrochen.');
    return false;
  }
  let html = content['index.html'];
  if (Object.hasOwn(content, 'styles.css')) html = ensureAssetLink(html, 'css');
  if (Object.hasOwn(content, 'script.js')) html = ensureAssetLink(html, 'js');
  editors.set('html', html);
  editors.set('css', content['styles.css'] ?? '');
  editors.set('js', content['script.js'] ?? '');
  onImported();
  setStatus(`ZIP importiert: ${Object.keys(content).join(', ')}`);
  return true;
}

export function setupZipImport(editors, { onImported }) {
  const button = required('importZipBtn');
  const picker = required('importZipFile');
  button.addEventListener('click', () => {
    if (!window.JSZip) { setStatus('ZIP-Import nicht verfügbar: JSZip fehlt.'); return; }
    picker.value = '';
    picker.click();
  });
  picker.addEventListener('change', async () => {
    const file = picker.files?.[0];
    if (!file) return;
    button.disabled = true;
    try {
      await importZipProject(file, file.name, editors, onImported);
    } catch (error) {
      console.error('ZIP-Import fehlgeschlagen:', error);
      setStatus(`ZIP-Import fehlgeschlagen: ${error.message}`);
    } finally {
      button.disabled = false;
      picker.value = '';
    }
  });
}
