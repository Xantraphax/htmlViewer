import { required, setStatus } from './dom.js';
import { ensureAssetLink } from './html-links.js';

const MAX_ARCHIVE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const NAMES = ['index.html', 'styles.css', 'script.js'];

/** ZIP-Projekte aus dem Viewer einlesen, ohne unbeteiligte Dateien zu überschreiben. */
export function setupZipImport(editors, { onImported }) {
  const button = required('importZipBtn');
  const picker = required('importZipFile');
  button.addEventListener('click', () => {
    if (!window.JSZip) {
      setStatus('ZIP-Import nicht verfügbar: JSZip konnte nicht geladen werden.');
      return;
    }
    picker.value = '';
    picker.click();
  });

  picker.addEventListener('change', async () => {
    const file = picker.files?.[0];
    if (!file) return;
    button.disabled = true;
    try {
      if (file.size > MAX_ARCHIVE_BYTES) throw new Error('Das ZIP-Archiv ist zu groß (maximal 10 MB).');
      const zip = await window.JSZip.loadAsync(file);
      const entries = new Map();
      for (const filename of NAMES) {
        // Nur Dateien im ZIP-Stammverzeichnis werden akzeptiert.
        const entry = zip.file(filename);
        if (entry && !entry.dir) {
          if (entry._data?.uncompressedSize > MAX_TEXT_BYTES) throw new Error(`${filename} ist zu groß (maximal 2 MB).`);
          entries.set(filename, entry);
        }
      }
      if (!entries.has('index.html')) throw new Error('Im ZIP fehlt die Datei index.html.');

      const content = {};
      for (const [filename, entry] of entries) {
        const text = await entry.async('string');
        if (new TextEncoder().encode(text).byteLength > MAX_TEXT_BYTES) throw new Error(`${filename} ist zu groß (maximal 2 MB).`);
        content[filename] = text;
      }
      if (!window.confirm(`Projekt „${file.name}“ importieren? Die aktuellen Editorinhalte werden ersetzt.`)) {
        setStatus('ZIP-Import abgebrochen.');
        return;
      }
      let html = content['index.html'];
      if (Object.hasOwn(content, 'styles.css')) html = ensureAssetLink(html, 'css');
      if (Object.hasOwn(content, 'script.js')) html = ensureAssetLink(html, 'js');
      editors.set('html', html);
      // Fehlende Dateien leeren, statt alte CSS-/JS-Reste mit dem neuen Projekt zu mischen.
      editors.set('css', content['styles.css'] ?? '');
      editors.set('js', content['script.js'] ?? '');
      onImported();
      setStatus(`ZIP importiert: ${[...entries.keys()].join(', ')}`);
    } catch (error) {
      console.error('ZIP-Import fehlgeschlagen:', error);
      setStatus(`ZIP-Import fehlgeschlagen: ${error.message}`);
    } finally {
      button.disabled = false;
      picker.value = '';
    }
  });
}
