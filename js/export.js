import { required, setStatus } from './dom.js';
import { isLocalFile } from './tabs.js';

/** Exportiert die aktuellen Editorinhalte als eigenständig nutzbares ZIP-Projekt. */
export function setupExport(editors) {
  const button = required('exportBtn');
  button.addEventListener('click', async () => {
    if (!window.JSZip) {
      setStatus('ZIP-Export nicht verfügbar: JSZip konnte nicht geladen werden.');
      return;
    }
    button.disabled = true;
    try {
      const html = editors.get('html');
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const hasCss = [...doc.querySelectorAll('link[rel~="stylesheet"][href]')]
        .some(link => isLocalFile(link.getAttribute('href'), 'styles.css'));
      const hasJs = [...doc.querySelectorAll('script[src]')]
        .some(script => isLocalFile(script.getAttribute('src'), 'script.js'));
      const zip = new window.JSZip();
      zip.file('index.html', html || '<!DOCTYPE html>\n<html lang="de"><head><meta charset="UTF-8"></head><body></body></html>');
      if (hasCss) zip.file('styles.css', editors.get('css'));
      if (hasJs) zip.file('script.js', editors.get('js'));
      const blob = await zip.generateAsync({type:'blob', compression:'DEFLATE', compressionOptions:{level:6}});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'html-projekt.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(`ZIP exportiert: index.html${hasCss ? ', styles.css' : ''}${hasJs ? ', script.js' : ''}`);
    } catch (error) {
      console.error('ZIP-Export fehlgeschlagen:', error);
      setStatus(`Export fehlgeschlagen: ${error.message}`);
    } finally {
      button.disabled = false;
    }
  });
}
