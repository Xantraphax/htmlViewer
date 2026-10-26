import { isLocalFile } from './tabs.js';

/** Ergänzt beim Import genau die Verweise, die die Vorschau benötigt. */
export function ensureAssetLink(html, kind) {
  if (kind !== 'css' && kind !== 'js') throw new Error('Unbekannter Dateityp');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (kind === 'css') {
    const linked = [...doc.querySelectorAll('link[rel~="stylesheet"][href]')]
      .some(link => isLocalFile(link.getAttribute('href'), 'styles.css'));
    if (linked) return html;
    if (!linked) {
      const link = doc.createElement('link');
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('href', 'styles.css');
      doc.head.appendChild(link);
    }
  } else {
    const linked = [...doc.querySelectorAll('script[src]')]
      .some(script => isLocalFile(script.getAttribute('src'), 'script.js'));
    if (linked) return html;
    if (!linked) {
      const script = doc.createElement('script');
      script.setAttribute('src', 'script.js');
      doc.body.appendChild(script);
    }
  }
  // DOMParser legt fehlende head/body automatisch an.
  // Bei Bedarf den vorhandenen Doctype erhalten.
  const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>\n` : '<!DOCTYPE html>\n';
  return doctype + doc.documentElement.outerHTML;
}
