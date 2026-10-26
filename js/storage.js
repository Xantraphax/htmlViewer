const KEYS = Object.freeze({html:'html_viewer_source_v1',css:'html_viewer_css_v1',js:'html_viewer_js_v1',autorender:'html_viewer_autorender'});
export function readSetting(name) {
  try { return localStorage.getItem(KEYS[name]); } catch { return null; }
}
export function writeSetting(name, value) {
  try { localStorage.setItem(KEYS[name], String(value)); return true; }
  catch { return false; }
}
export function debounce(fn, delay=300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer=setTimeout(() => fn(...args), delay); };
}
