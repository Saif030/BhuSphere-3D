import { describe, it, expect, vi, afterEach } from 'vitest';
import { clampFontLevel, fontSizeForLevel, getSavedFontLevel, applyFontLevel, FONT_SIZE_KEY } from './fontSize';

const realLocalStorage = (globalThis as any).localStorage;
const realDocument = (globalThis as any).document;
afterEach(() => {
  (globalThis as any).localStorage = realLocalStorage;
  (globalThis as any).document = realDocument;
  vi.unstubAllGlobals();
});

describe('font size levels', () => {
  it('clamps to the -1..+1 band', () => {
    expect(clampFontLevel(-5)).toBe(-1);
    expect(clampFontLevel(0)).toBe(0);
    expect(clampFontLevel(9)).toBe(1);
    expect(clampFontLevel(NaN)).toBe(0);
  });
  it('maps levels to root px sizes', () => {
    expect(fontSizeForLevel(-1)).toBe('14px');
    expect(fontSizeForLevel(0)).toBe('16px');
    expect(fontSizeForLevel(1)).toBe('18px');
  });
  it('defaults to 0 and round-trips apply', () => {
    const bag: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k in bag ? bag[k] : null),
      setItem: (k: string, v: string) => { bag[k] = v; },
      removeItem: (k: string) => { delete bag[k]; },
    });
    vi.stubGlobal('document', { documentElement: { style: {} as any } });
    localStorage.removeItem(FONT_SIZE_KEY);
    expect(getSavedFontLevel()).toBe(0);
    expect(applyFontLevel(1)).toBe(1);
    expect(document.documentElement.style.fontSize).toBe('18px');
    expect(getSavedFontLevel()).toBe(1);
    expect(applyFontLevel(0)).toBe(0);
    expect(document.documentElement.style.fontSize).toBe('16px');
  });
  it('survives missing browser APIs', () => {
    vi.stubGlobal('localStorage', undefined);
    vi.stubGlobal('document', undefined);
    expect(getSavedFontLevel()).toBe(0);
    expect(applyFontLevel(1)).toBe(1);
  });
});
