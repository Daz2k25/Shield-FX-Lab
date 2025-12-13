const ARENA_STORAGE_KEY = 'shieldFxArenaSeed';

function randomSeed() {
  return Math.floor(Math.random() * 1_000_000_000)
    .toString(16)
    .padStart(8, '0');
}

export function startArenaMode() {
  const labUi = document.getElementById('labUi');
  const arenaUi = document.getElementById('arenaUi');
  const statusEl = document.getElementById('arenaStatus');
  const seedEl = document.getElementById('arenaSeed');
  const seedBtn = document.getElementById('arenaSeedBtn');
  const help = document.getElementById('help');

  if (labUi) labUi.classList.add('hidden');
  if (arenaUi) arenaUi.classList.remove('hidden');
  if (help) help.classList.add('hidden');

  const disposers = [];

  const setStatus = (text) => {
    if (statusEl) statusEl.textContent = text;
  };

  const setSeed = (seed) => {
    if (seedEl) seedEl.textContent = seed;
    window.localStorage.setItem(ARENA_STORAGE_KEY, seed);
    setStatus('Seed locked for deterministic scaffolding');
  };

  const refreshSeed = () => {
    const stored = window.localStorage.getItem(ARENA_STORAGE_KEY);
    setSeed(stored || randomSeed());
  };

  if (seedBtn) {
    const onClick = () => setSeed(randomSeed());
    seedBtn.addEventListener('click', onClick);
    disposers.push(() => seedBtn.removeEventListener('click', onClick));
  }

  refreshSeed();

  return {
    dispose() {
      disposers.forEach((fn) => fn());
      if (arenaUi) arenaUi.classList.add('hidden');
      if (statusEl) statusEl.textContent = 'Arena mode paused';
      if (help) help.classList.add('hidden');
    },
  };
}
