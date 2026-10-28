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
  // Strukturelle Tags stehen einzeln und ihre Kinder sind nachvollziehbar eingerückt.
  // Quelltext in <pre>, <script>, <style> usw. bleibt unverändert.
  const openTag = el => `<${el.localName}${[...el.attributes].map(a => ` ${a.name}=\"${a.value.replaceAll('\"','&quot;')}\"`).join('')}>`;
  const lines = [doctype.trimEnd(), openTag(doc.documentElement)];
  const addSection = (element, name) => {
    lines.push(`  ${openTag(element)}`);
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && !child.textContent.trim()) continue;
      const markup = child.nodeType === Node.ELEMENT_NODE ? child.outerHTML : child.textContent;
      for (const line of markup.split('\n')) lines.push(`    ${line}`);
    }
    lines.push(`  </${name}>`);
  };
  addSection(doc.head, 'head');
  addSection(doc.body, 'body');
  lines.push('</html>');
  return lines.join('\n');
}
