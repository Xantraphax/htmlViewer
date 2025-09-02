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
const jsTabBtn = document.getElementById('tabJs');
const jsEditorDiv = document.getElementById('jsEditor');
const loadJsBtn = document.getElementById('loadJsBtn');

const overlay = document.getElementById('jsOverlay');
const overlayHeader = document.getElementById('jsOverlayHeader');
const overlayContent = document.getElementById('jsOverlayContent');
const overlayClose = document.getElementById('jsOverlayClose');
const overlayReset = document.getElementById('jsOverlayReset');

const STORAGE_KEY = 'html_viewer_source_v1';
const AUTORENDER_KEY = 'html_viewer_autorender';
const CSS_KEY = 'html_viewer_css_v1';
const JS_KEY = 'html_viewer_js_v1';

let cssContent = '';
let jsContent = '';
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

const jsEditor = CodeMirror.fromTextArea(document.getElementById('jsArea'), {
  mode: 'javascript',
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
  const savedJs = localStorage.getItem(JS_KEY);
  if (savedJs) {
	jsContent = savedJs;
	jsEditor.setValue(savedJs);
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

jsEditor.on('change', () => {
  jsContent = jsEditor.getValue();
  try { localStorage.setItem(JS_KEY, jsContent); } catch (e) {}
  if (autoRenderToggle.checked) render();
});

function render() {
  const html = getHtmlSource() || '<!doctype html><meta charset="utf-8"><title>Leer</title><p>Kein Inhalt.</p>';
  
  let wrappedCss = '';
  if (html.includes('<link rel="stylesheet" href="styles.css">') && getCssSource().trim() !== '') {
    wrappedCss = `<style>${getCssSource()}</style>`;
  }

  let wrappedJs = '';
  if (html.includes('<script src="script.js"></script>') && jsEditor.getValue().trim() !== '') {
  let jsCode = jsEditor.getValue().replace(/\/\/# sourceMappingURL=.*$/gm, '');
  
  const errorCaptureCode = `
    (function(){
      const origLog = console.log;
      const origErr = console.error;
      console.log = function(...args){
        parent.postMessage({type:'log', msg: args.join(' ')}, '*');
        origLog.apply(console, args);
      };
      console.error = function(...args){
        parent.postMessage({type:'error', msg: args.join(' ')}, '*');
        origErr.apply(console, args);
      };
      window.onerror = function(msg, src, line, col, err){
        parent.postMessage({type:'error', msg: msg + ' at ' + src + ':' + line + ':' + col}, '*');
      };
      window.onunhandledrejection = function(e){
        parent.postMessage({type:'error', msg: 'Unhandled Promise: ' + e.reason}, '*');
      };
    })();
  `;

  wrappedJs = `<script>${errorCaptureCode}\n${jsCode}<\/script>`;
}

  let output = html.includes('</head>')
    ? html.replace('</head>', `${wrappedCss}</head>`)
    : wrappedCss + html;

  output = output.includes('</body>')
    ? output.replace('</body>', `${wrappedJs}</body>`)
    : output + wrappedJs;

  preview.srcdoc = output;
  status.textContent = 'Gerendert';

  checkForCssLink();
  checkForJsLink();
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

jsTabBtn.addEventListener('click', () => {
  jsEditorDiv.classList.remove('hidden');
  htmlEditorDiv.classList.add('hidden');
  cssEditorDiv.classList.add('hidden');
  jsTabBtn.classList.add('active');
  htmlTabBtn.classList.remove('active');
  cssTabBtn.classList.remove('active');
  jsEditor.refresh();
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

function checkForJsLink() {
  const html = getHtmlSource();
  if (html.includes('<script src="script.js"></script>')) {
    jsTabBtn.style.display = 'inline-block';
  } else {
    jsTabBtn.style.display = 'none';
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


loadCssBtn.addEventListener('click', () => {
	const url = prompt('Bitte die URL der CSS-Datei eingeben:');
	if (url) loadCssFile(url);
});

// Funktion: Js-Datei von Link lade
async function loadJsFile(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fehler beim Laden: ${response.status}`);
    const jsContent = await response.text();
    jsEditor.setValue(jsContent);
    render();
    status.textContent = `JS-Datei von ${url} geladen`;
  } catch (error) {
    console.error('Fehler beim Laden der JS-Datei:', error);
    status.textContent = `Fehler beim Laden der Datei: ${error.message}`;
  }
}

loadJsBtn.addEventListener('click', () => {
  const url = prompt('Bitte die URL der JS-Datei eingeben:');
  if (url) loadJsFile(url);
});


// --- Neu: URL-Parameter einlesen und automatisch laden ---
function getUrlParams() {
  return new URLSearchParams(window.location.search);
}

async function initFromUrlParams() {
  const params = getUrlParams();
  const htmlUrl = params.get("html");
  const cssUrl = params.get("css");
  const menuParam = params.get("menu");
  const autoParam = params.get("autorender");

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
  if (menuParam === "0") {
    document.getElementById("controls")?.classList.add("hidden"); 
  } else if (menuParam === "1") {
    document.getElementById("controls")?.classList.remove("hidden");
  }

  // AutoRender aktivieren/deaktivieren
  if (autoParam === "1") {
    autoRenderToggle.checked = true;
    localStorage.setItem(AUTORENDER_KEY, "true");
  } else if (autoParam === "0") {
    autoRenderToggle.checked = false;
    localStorage.setItem(AUTORENDER_KEY, "false");
  }

  // Falls nichts geladen wurde, normal rendern
  if (!htmlUrl && !cssUrl) {
    render();
  }
}

//Konsolenweiterleitung
function showOverlayMessage(msg, type='log') {
    overlay.style.display = 'block';
    const line = document.createElement('div');
    line.textContent = `[${type}] ${msg}`;
    overlayContent.appendChild(line);
    overlayContent.scrollTop = overlayContent.scrollHeight;
}

// Schließen-Button
overlayClose.addEventListener('click', () => overlay.style.display = 'none');

// Reset-Button
overlayReset.addEventListener('click', () => overlayContent.innerHTML = '');

// Drag & Drop
let isDragging = false;
let offsetX, offsetY;

overlayHeader.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - overlay.offsetLeft;
    offsetY = e.clientY - overlay.offsetTop;
    document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    overlay.style.left = (e.clientX - offsetX) + 'px';
    overlay.style.top = (e.clientY - offsetY) + 'px';
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = '';
});


window.addEventListener('message', (e) => {
    if (!e.data || !e.data.type) return;
    showOverlayMessage(e.data.msg, e.data.type);
});

// Initial check
checkForCssLink();

