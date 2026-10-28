import { required, setStatus } from './dom.js';
import { importZipProject } from './import-zip.js';

/** Gemeinsamer Import für Menübutton und ?zip=... . */
export async function importZipFromUrl(entered, editors, onImported, options = {}) {
    let url;
    try {
      url = new URL(entered.trim());
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error('Nur HTTP- und HTTPS-Links sind erlaubt.');
      }
    } catch (error) {
      throw new Error(`Ungültiger Link: ${error.message}`);
    }
    setStatus('ZIP-Datei wird über den Link geladen …');
    try {
      // Kein no-cors: opaque Responses können nicht als ZIP gelesen werden.
      const response = await fetch(url.href, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) throw new Error(`Server antwortet mit HTTP ${response.status}.`);
      const declaredSize = Number(response.headers.get('content-length'));
      if (declaredSize > 10 * 1024 * 1024) throw new Error('ZIP-Datei zu groß (max. 10 MB).');
      const blob = await response.blob();
      if (blob.size > 10 * 1024 * 1024) throw new Error('ZIP-Datei zu groß (max. 10 MB).');
      // ZIP-Format erkennen, statt Freigabe-/Login-HTML als ZIP zu interpretieren.
      const signature = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
      if (signature[0] !== 0x50 || signature[1] !== 0x4b ||
          ![[3,4],[5,6],[7,8]].some(([a,b]) => signature[2] === a && signature[3] === b)) {
        throw new Error('Dieser Link liefert keine ZIP-Datei, sondern vermutlich eine Freigabe- oder Anmeldeseite. Bitte einen direkten ZIP-Downloadlink verwenden.');
      }
      return await importZipProject(blob, url.pathname.split('/').pop() || 'Online-Projekt', editors, onImported, options);
    } catch (error) {
      console.error('ZIP-Link-Import fehlgeschlagen:', error);
      if (error instanceof TypeError) {
        setStatus('ZIP-Link-Import nicht möglich: Abruf durch CORS/Netzwerk blockiert. Der Cloud-Anbieter muss Downloads von GitHub Pages erlauben. Alternativ ZIP herunterladen und „ZIP importieren“ nutzen.');
      } else {
        setStatus(`ZIP-Link-Import fehlgeschlagen: ${error.message}`);
      }
      return false;
    }
}

/** Manueller Import-Button verwendet dieselbe Verarbeitung wie der URL-Parameter. */
export function setupLinkImport(editors, { onImported }) {
  const button = required('importLinkBtn');
  button.addEventListener('click', async () => {
    const entered = window.prompt('Direkten Downloadlink zu einem ZIP-Archiv eingeben:');
    if (!entered?.trim()) return;
    button.disabled = true;
    try {
      await importZipFromUrl(entered.trim(), editors, onImported, options);
    } finally {
      button.disabled = false;
    }
  });
}
