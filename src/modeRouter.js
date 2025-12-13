export function createModeRouter({ modes, defaultMode, storageKey = 'mode', onModeChanged }) {
  let activeInstance = null;
  let activeName = null;

  const availableModes = Object.keys(modes || {});
  const fallback = defaultMode || availableModes[0];

  const stored = storageKey ? window.localStorage.getItem(storageKey) : null;
  const initial = availableModes.includes(stored) ? stored : fallback;

  const switchMode = (name) => {
    if (!availableModes.includes(name)) {
      throw new Error(`Unknown mode: ${name}`);
    }
    if (activeName === name) return;

    if (activeInstance && typeof activeInstance.dispose === 'function') {
      activeInstance.dispose();
    }

    activeInstance = modes[name]();
    activeName = name;

    if (storageKey) window.localStorage.setItem(storageKey, name);
    if (onModeChanged) onModeChanged(name);
  };

  switchMode(initial);

  return {
    switchMode,
    getActiveModeName: () => activeName,
  };
}
