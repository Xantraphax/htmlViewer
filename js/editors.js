import { required } from './dom.js';
import { readSetting, writeSetting, debounce } from './storage.js';

export function createEditors({ onChange }) {
  if (!window.CodeMirror) throw new Error('CodeMirror wurde nicht geladen.');
  const instances = Object.fromEntries([
    ['html','source','htmlmixed'], ['css','cssArea','css'], ['js','jsArea','javascript']
  ].map(([name,id,mode]) => [name, window.CodeMirror.fromTextArea(required(id), {
    mode, lineNumbers:true, theme:'eclipse'
  })]));

  // Initialwerte vor Registrierung der Change-Handler setzen.
  for (const name of Object.keys(instances)) {
    const saved = readSetting(name);
    if (saved !== null && (name !== 'html' || !instances[name].getValue())) instances[name].setValue(saved);
  }
  for (const [name, instance] of Object.entries(instances)) {
    const persist = debounce(() => writeSetting(name, instance.getValue()), 300);
    instance.on('change', () => { persist(); onChange(name); });
  }
  return {
    instances,
    get(name) { return instances[name].getValue(); },
    set(name, content) { instances[name].setValue(content); },
    refresh(name) { requestAnimationFrame(() => instances[name].refresh()); }
  };
}
