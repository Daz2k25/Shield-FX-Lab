import { startApp } from '../app.js';

export function startLabMode() {
  const labUi = document.getElementById('labUi');
  const arenaUi = document.getElementById('arenaUi');
  const help = document.getElementById('help');

  if (arenaUi) arenaUi.classList.add('hidden');
  if (labUi) labUi.classList.remove('hidden');
  if (help) help.classList.remove('hidden');

  const app = startApp();

  return {
    dispose() {
      if (app && typeof app.dispose === 'function') app.dispose();
      if (labUi) labUi.classList.add('hidden');
      if (help) help.classList.add('hidden');
    },
  };
}
