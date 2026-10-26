import { required } from './dom.js';

export function setupTabs(editors) {
  const buttons={html:required('tabHtml'),css:required('tabCss'),js:required('tabJs')};
  const panels={html:required('htmlEditor'),css:required('cssEditor'),js:required('jsEditor')};
  let active='html';
  function select(name) {
    active=name;
    for (const type of Object.keys(buttons)) {
      panels[type].classList.toggle('hidden',type!==name);
      buttons[type].classList.toggle('active',type===name);
      buttons[type].setAttribute('aria-selected',String(type===name));
    }
    editors.refresh(name);
  }
  for (const [name,button] of Object.entries(buttons)) button.addEventListener('click',()=>select(name));
  function sync(html) {
    const doc = new DOMParser().parseFromString(html,'text/html');
    const hasCss=[...doc.querySelectorAll('link[rel~="stylesheet"][href]')].some(x=>isLocalFile(x.getAttribute('href'),'styles.css'));
    const hasJs=[...doc.querySelectorAll('script[src]')].some(x=>isLocalFile(x.getAttribute('src'),'script.js'));
    buttons.css.hidden=!hasCss;
    buttons.js.hidden=!hasJs;
    // CSS/JS-Tabs bleiben nur bei bestehendem passendem Verweis sichtbar.
    if ((active==='css'&&!hasCss)||(active==='js'&&!hasJs)) select('html');
  }
  select('html');
  return { select, sync };
}
export function isLocalFile(value,filename) {
  if (!value) return false;
  const path=value.split(/[?#]/,1)[0];
  return path===filename || path===`./${filename}`;
}
