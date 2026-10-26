export function required(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Erforderliches HTML-Element fehlt: #${id}`);
  return el;
}
export function setStatus(message) {
  required('status').textContent = message;
}
