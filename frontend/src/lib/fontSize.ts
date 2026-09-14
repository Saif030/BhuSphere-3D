/** GIGW-style text-size control (A- / A / A+).
 *  Tailwind sizes in rem, so changing the root font-size scales the whole UI.
 *  Level persists in localStorage and is re-applied pre-render by index.html. */

export const FONT_SIZE_KEY = 'bhu_fontsize';
export const FONT_MIN = -1;
export const FONT_MAX = 1;
export const FONT_DEFAULT = 0;

const PX: Record<number, string> = { [-1]: '14px', [0]: '16px', [1]: '18px' };

export function clampFontLevel(l: number): number {
  if (isNaN(l)) return FONT_DEFAULT;
  return Math.max(FONT_MIN, Math.min(FONT_MAX, Math.trunc(l)));
}

export function fontSizeForLevel(l: number): string {
  return PX[clampFontLevel(l)] || '16px';
}

export function getSavedFontLevel(): number {
  try {
    const raw = localStorage.getItem(FONT_SIZE_KEY);
    if (raw == null) return FONT_DEFAULT;
    return clampFontLevel(parseInt(raw, 10));
  } catch {
    return FONT_DEFAULT;
  }
}

/** Apply a level to <html>, persist it, and return the clamped level. */
export function applyFontLevel(l: number): number {
  const c = clampFontLevel(l);
  try {
    document.documentElement.style.fontSize = fontSizeForLevel(c);
  } catch { /* non-DOM environment */ }
  try {
    localStorage.setItem(FONT_SIZE_KEY, String(c));
  } catch { /* private mode */ }
  return c;
}
