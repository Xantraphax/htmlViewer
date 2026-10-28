import { required, setStatus } from './dom.js';
import { createProjectZip, normalizeZipName } from './export.js';

// Nach dem Deployment hier die URL DEINES Cloudflare Workers eintragen.
// Beispiel: https://html-viewer-upload.DEIN-NAME.workers.dev
const WORKER_URL = 'https://html-viewer-upload.xantraphax.workers.dev'; // Nicht die öffentliche r2.dev-Adresse!

export function setupCloudSave(editors) {
  const button = required('cloudSaveBtn');
  button.addEventListener('click', async () => {
    if (!WORKER_URL) {
      setStatus('Cloud-Speichern noch nicht eingerichtet: Worker-URL in js/cloud-save.js eintragen.');
      return;
    }
    const entered = prompt('Name des Cloud-Projekts:', 'html-projekt');
    if (entered === null) return;
    const filename = normalizeZipName(entered);
    if (!filename) { setStatus('Ungültiger Projektname.'); return; }
    const password = prompt('Upload-Passwort für Cloudflare R2:');
    if (password === null) return;
    if (!password) { setStatus('Upload-Passwort fehlt.'); return; }
    button.disabled = true;
    try {
      setStatus('ZIP wird erstellt …');
      const blob = await createProjectZip(editors);
      if (blob.size > 10 * 1024 * 1024) throw new Error('Maximal 10 MB pro ZIP-Projekt.');
      setStatus('Projekt wird in Cloudflare R2 gespeichert …');
      const response = await fetch(`${WORKER_URL.replace(/\/$/, '')}/upload`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/zip',
          'X-Project-Name': filename
        },
        body: blob
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (!data.url) throw new Error('Der Server hat keinen Downloadlink zurückgegeben.');
      setStatus(`In R2 gespeichert: ${filename}`);
      // Nur der Link wird kopiert, nie das Passwort.
      const shouldCopy = confirm(`Projekt gespeichert!\n\nDownloadlink:\n${data.url}\n\nLink in die Zwischenablage kopieren?`);
      if (shouldCopy) {
        try { await navigator.clipboard.writeText(data.url); }
        catch { prompt('Link zum Kopieren:', data.url); }
      }
    } catch (error) {
      console.error('Cloud-Upload fehlgeschlagen:', error);
      setStatus(`Cloud-Speichern fehlgeschlagen: ${error.message}`);
    } finally {
      button.disabled = false;
    }
  });
}
