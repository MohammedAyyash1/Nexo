const ACCENT_MAP = {
  purple: { c1: '#7c3aed', c2: '#a855f7', light: '#c9a4f7' },
  blue:   { c1: '#2563eb', c2: '#3b82f6', light: '#93c5fd' },
  green:  { c1: '#16a34a', c2: '#22c55e', light: '#86efac' },
  pink:   { c1: '#db2777', c2: '#ec4899', light: '#f9a8d4' },
  orange: { c1: '#ea580c', c2: '#f97316', light: '#fdba74' },
};

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

export function applyAccent(id) {
  const a = ACCENT_MAP[id] || ACCENT_MAP.purple;
  const root = document.documentElement;
  root.style.setProperty('--accent-1', a.c1);
  root.style.setProperty('--accent-2', a.c2);
  root.style.setProperty('--accent-light', a.light);
  const rgb1 = hexToRgb(a.c1);
  const rgb2 = hexToRgb(a.c2);
  root.style.setProperty('--accent-1-rgb', `${rgb1.r}, ${rgb1.g}, ${rgb1.b}`);
  root.style.setProperty('--accent-rgb', `${rgb2.r}, ${rgb2.g}, ${rgb2.b}`);
  localStorage.setItem('nexo_accent', id);
}

export function loadSavedAccent() {
  const saved = localStorage.getItem('nexo_accent') || 'purple';
  applyAccent(saved);
  return saved;
}export function applyThemeMode(mode) {
  const root = document.documentElement;
  if (mode === 'light') {
    root.classList.add('light');
  } else {
    root.classList.remove('light');
  }
  localStorage.setItem('nexo_theme_mode', mode);
}

export function loadSavedThemeMode() {
  const saved = localStorage.getItem('nexo_theme_mode') || 'dark';
  applyThemeMode(saved);
  return saved;
}