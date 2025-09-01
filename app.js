const preview = document.getElementById('preview');
const renderBtn = document.getElementById('renderBtn');
const autoRenderToggle = document.getElementById('autoRenderToggle');
const status = document.getElementById('status');
const htmlTabBtn = document.getElementById('tabHtml');
const cssTabBtn = document.getElementById('tabCss');
const htmlEditorDiv = document.getElementById('htmlEditor');
const cssEditorDiv = document.getElementById('cssEditor');
const loadHtmlBtn = document.getElementById('loadHtmlBtn');
const divider = document.getElementById("divider");
const editor = document.getElementById("editor");

const STORAGE_KEY = 'html_viewer_source_v1';
const AUTORENDER_KEY = 'html_viewer_autorender';
const CSS_KEY = 'html_viewer_css_v1';

let cssContent = '';
let isResizing = false;
let pendingX = null;


// CodeMirror initialisieren
const sourceEditor = CodeMirror.fromTextArea(document.getElementById('source'), {
  mode: 'htmlmixed',
  lineNumbers: true,
  theme: 'eclipse'
});

const cssEditor = CodeMirror.fromTextArea(document.getElementById('cssArea'), {
  mode: 'css',
  lineNumbers: true,
  theme: 'eclipse'
});

//Resizing of editor
divider.addEventListener("pointerdown", (e) => {
  isResizing = true;
  divider.setPointerCapture(e.pointerId); // Wichtig!
  document.body.style.cursor = "col-resize";
});

divider.addEventListener("pointermove", (e) => {
  if (!isResizing) return;
  pendingX = e.clientX;
  requestAnimationFrame(updateWidth);
});

divider.addEventListener("pointerup", (e) => {
  isResizing = false;
  divider.releasePointerCapture(e.pointerId);
  document.body.style.cursor = "default";
});

function updateWidth() {
  if (pendingX === null) return;
  let newWidth = pendingX;
  if (newWidth < 150) newWidth = 150; // Mindestbreite
  editor.style.width = newWidth + "px";
  pendingX = null;
}


// Wrapper-Funktionen
function getHtmlSource() {
  return sourceEditor.getValue();
}
function getCssSource() {
  return cssEditor.getValue();
}
function setHtmlSource(val) {
  sourceEditor.setValue(val);
}
function setCssSource(val) {
  cssEditor.setValue(val);
}

// CSS-Tab standardmäßig verstecken
cssTabBtn.style.display = 'none';

// Bestehenden Inhalt aus LocalStorage laden
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && !getHtmlSource()) {
    setHtmlSource(saved);
    status.textContent = 'Inhalt aus lokaler Speicherung geladen';
  }
  const auto = localStorage.getItem(AUTORENDER_KEY);
  if (auto === 'true') {
    autoRenderToggle.checked = true;
  }
  const savedCss = localStorage.getItem(CSS_KEY);
  if (savedCss) {
    cssContent = savedCss;
    setCssSource(savedCss);
  }
} catch (e) {}

// Speichern, wenn Benutzer tippt (gedrosselt)
let saveTimer = null;
sourceEditor.on('change', () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, getHtmlSource()); } catch (e) {}
    status.textContent = 'Entwurf gespeichert';
    checkForCssLink();
  }, 300);

  if (autoRenderToggle.checked) {
    render();
  }
});

cssEditor.on('change', () => {
  cssContent = getCssSource();
  try { localStorage.setItem(CSS_KEY, cssContent); } catch (e) {}
  if (autoRenderToggle.checked) {
    render();
  }
});

function render() {
  const html = getHtmlSource() || '<!doctype html><meta charset="utf-8"><title>Leer</title><p>Kein Inhalt.</p>';
  
  // CSS nur einfügen, wenn Inhalt vorhanden UND Link-Tag existiert
  let wrappedCss = '';
  if (html.includes('<link rel="stylesheet" href="styles.css">') && getCssSource().trim() !== '') {
    wrappedCss = `<style>${getCssSource()}</style>`;
  }
  
  // Immer HTML rendern
  preview.srcdoc = html.includes('</head>')
    ? html.replace('</head>', `${wrappedCss}</head>`)
    : wrappedCss + html;
    
  status.textContent = 'Gerendert';
  checkForCssLink(); // CSS-Tab anzeigen/verstecken
}

// Render-Button
renderBtn.addEventListener('click', () => {
	render();
});
// Tabs steuern
htmlTabBtn.addEventListener('click', () => {
  htmlEditorDiv.classList.remove('hidden');
  cssEditorDiv.classList.add('hidden');
  htmlTabBtn.classList.add('active');
  cssTabBtn.classList.remove('active');
  sourceEditor.refresh();
});

cssTabBtn.addEventListener('click', () => {
  cssEditorDiv.classList.remove('hidden');
  htmlEditorDiv.classList.add('hidden');
  cssTabBtn.classList.add('active');
  htmlTabBtn.classList.remove('active');
  cssEditor.refresh();
});

//Render after loading
addEventListener("DOMContentLoaded", (event) => { 
	initFromUrlParams();
})

// Auto-Render speichern
autoRenderToggle.addEventListener('change', () => {
  localStorage.setItem(AUTORENDER_KEY, autoRenderToggle.checked);
  status.textContent = autoRenderToggle.checked ? 'Auto-Render aktiviert' : 'Auto-Render deaktiviert';
  if (autoRenderToggle.checked) {
    render();
  }
});

// Tastaturkürzel: Strg/Cmd+Enter rendert
document.addEventListener('keydown', (e) => {
  const isCmdOrCtrl = e.metaKey || e.ctrlKey;
  if (isCmdOrCtrl && e.key === 'Enter') {
    e.preventDefault();
    render();
  }
});

// Hilfsfunktion: Prüfen ob Link-Tag existiert
function checkForCssLink() {
  const html = getHtmlSource();
  if (html.includes('<link rel="stylesheet" href="styles.css">')) {
    cssTabBtn.style.display = 'inline-block';
  } else {
    cssTabBtn.style.display = 'none';
    // Falls man gerade im CSS Tab war -> zurück zu HTML
    if (!htmlEditorDiv.classList.contains('hidden')) return;
    htmlTabBtn.click();
  }
}
// Funktion: HTML-Datei von Link laden
async function loadHtmlFile(url) {
	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`Fehler beim Laden: ${response.status}`);
		const htmlContent = await response.text();
		setHtmlSource(htmlContent);
		render();
		status.textContent = `HTML-Datei von ${url} geladen`;
	} catch (error) {
		console.error('Fehler beim Laden der HTML-Datei:', error);
		status.textContent = `Fehler beim Laden der Datei: ${error.message}`;
	}
}

// Event für Button zum Laden der Datei
loadHtmlBtn.addEventListener('click', () => {
	const url = prompt('Bitte die URL der HTML-Datei eingeben:');
	if (url) loadHtmlFile(url);
});

// Funktion: CSS-Datei von Link laden
async function loadCssFile(url) {
	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`Fehler beim Laden: ${response.status}`);
		const cssContent = await response.text();
		setCssSource(cssContent);
		render();
		status.textContent = `HTML-Datei von ${url} geladen`;
	} catch (error) {
		console.error('Fehler beim Laden der CSS-Datei:', error);
		status.textContent = `Fehler beim Laden der Datei: ${error.message}`;
	}
}

// Event für Button zum Laden der Datei
loadCssBtn.addEventListener('click', () => {
	const url = prompt('Bitte die URL der CSS-Datei eingeben:');
	if (url) loadCssFile(url);
});

// --- Neu: URL-Parameter einlesen und automatisch laden ---
function getUrlParams() {
  return new URLSearchParams(window.location.search);
}

async function initFromUrlParams() {
  const params = getUrlParams();
  const htmlUrl = params.get("html");
  const cssUrl = params.get("css");

  if (htmlUrl) {
    try {
      await loadHtmlFile(htmlUrl);
      status.textContent = `HTML von ${htmlUrl} geladen`;
    } catch (e) {
      console.error("Fehler beim Laden von HTML über Parameter:", e);
      status.textContent = `Fehler beim Laden von HTML: ${e.message}`;
    }
  }

  if (cssUrl) {
    try {
      await loadCssFile(cssUrl);
      status.textContent = `CSS von ${cssUrl} geladen`;
    } catch (e) {
      console.error("Fehler beim Laden von CSS über Parameter:", e);
      status.textContent = `Fehler beim Laden von CSS: ${e.message}`;
    }
  }

  // Falls nichts geladen wurde, normal rendern
  if (!htmlUrl && !cssUrl) {
    render();
  }
}

// Initial check
checkForCssLink();

