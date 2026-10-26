import { required } from './dom.js';

export function setupConsoleOverlay() {
  const overlay = required('jsOverlay');
  const header = required('jsOverlayHeader');
  const content = required('jsOverlayContent');
  const closeButton = required('jsOverlayClose');
  const resetButton = required('jsOverlayReset');

  // Geschlossen bleibt geschlossen, bis der Nutzer neu rendert.
  let closedByUser = false;
  let count = 0;
  let drag = null;

  closeButton.type = 'button';
  resetButton.type = 'button';
  for (const button of [closeButton, resetButton]) {
    // Ein Button-Klick darf das Ziehen des Headers nicht starten.
    button.addEventListener('pointerdown', event => event.stopPropagation());
  }

  closeButton.addEventListener('click', event => {
    event.stopPropagation();
    closedByUser = true;
    overlay.style.display = 'none';
  });

  function clear() {
    content.replaceChildren();
    count = 0;
  }
  resetButton.addEventListener('click', event => {
    event.stopPropagation();
    clear();
  });

  header.style.touchAction = 'none';
  header.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    const bounds = overlay.getBoundingClientRect();
    drag = {
      id: event.pointerId,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top
    };
    // Die ursprüngliche Positionierung per right darf left nicht überlagern.
    overlay.style.left = `${bounds.left}px`;
    overlay.style.top = `${bounds.top}px`;
    overlay.style.right = 'auto';
    header.setPointerCapture(event.pointerId);
  });

  header.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const maxX = Math.max(0, window.innerWidth - overlay.offsetWidth);
    const maxY = Math.max(0, window.innerHeight - overlay.offsetHeight);
    overlay.style.left = `${Math.max(0, Math.min(maxX, event.clientX - drag.offsetX))}px`;
    overlay.style.top = `${Math.max(0, Math.min(maxY, event.clientY - drag.offsetY))}px`;
  });

  function stopDrag(event) {
    if (drag?.id !== event.pointerId) return;
    drag = null;
    if (header.hasPointerCapture(event.pointerId)) header.releasePointerCapture(event.pointerId);
  }
  header.addEventListener('pointerup', stopDrag);
  header.addEventListener('pointercancel', stopDrag);
  header.addEventListener('lostpointercapture', () => { drag = null; });

  return {
    show(message, type = 'log') {
      const line = document.createElement('div');
      line.textContent = `[${type}] ${String(message)}`;
      content.appendChild(line);
      count++;
      if (count > 500) {
        content.firstElementChild?.remove();
        count--;
      }
      content.scrollTop = content.scrollHeight;
      if (!closedByUser) overlay.style.display = 'block';
    },
    clear,
    beginRender() {
      clear();
      closedByUser = false;
      // Noch nicht anzeigen; erst bei einer Konsolenmeldung.
      overlay.style.display = 'none';
    }
  };
}
