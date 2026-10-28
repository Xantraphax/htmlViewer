/** Toolbar-Menüs schließen beim Auswählen, außerhalb klicken oder Escape. */
export function setupToolbar() {
  const menus = [...document.querySelectorAll('#controls details.insert-menu')];
  menus.forEach(menu => {
    menu.addEventListener('toggle', () => {
      if (menu.open) menus.forEach(other => {if (other !== menu) other.open = false;});
    });
    menu.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', () => { menu.open = false; });
    });
  });
  document.addEventListener('pointerdown', event => {
    for (const menu of menus) if (!menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') menus.forEach(menu => {menu.open = false;});
  });

  const fullscreen = document.getElementById('fullscreenBtn');
  if (!fullscreen) return;
  const sync = () => {
    const active = Boolean(document.fullscreenElement);
    fullscreen.setAttribute('aria-pressed', String(active));
    fullscreen.setAttribute('aria-label', active ? 'Vollbild verlassen' : 'Vollbild einschalten');
    fullscreen.title = active ? 'Vollbild verlassen (Esc)' : 'Vollbild einschalten';
  };
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      console.warn('Vollbild ist in diesem Kontext nicht erlaubt:', error);
      const status = document.getElementById('status');
      if (status) status.textContent = 'Vollbild nicht erlaubt. Bei Moodle ggf. allow="fullscreen" im iFrame ergänzen.';
    }
  });
  document.addEventListener('fullscreenchange', sync);
  sync();
}
