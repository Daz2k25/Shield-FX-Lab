import { createModeRouter } from './modeRouter.js';
import { startLabMode } from './modes/labMode.js';
import { startArenaMode } from './modes/arenaMode.js';

const modeSelect = document.getElementById('modeSelect');
const modeLabel = document.getElementById('modeStatus');

const router = createModeRouter({
  modes: {
    lab: startLabMode,
    arena: startArenaMode,
  },
  storageKey: 'shieldFxMode',
  defaultMode: 'lab',
  onModeChanged: (name) => {
    if (modeSelect) modeSelect.value = name;
    if (modeLabel) modeLabel.textContent = name === 'lab' ? 'FX Lab' : 'Arena (WIP)';
  },
});

if (modeSelect) {
  modeSelect.value = router.getActiveModeName();
  modeSelect.addEventListener('change', () => router.switchMode(modeSelect.value));
}

