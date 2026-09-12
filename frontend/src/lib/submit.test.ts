import { describe, it, expect } from 'vitest';
import { toSqm, showBlocks, STATUS_META, AREA_ROWS } from './submit';

describe('toSqm canonical conversion', () => {
  it('converts sq ft, ha and acre to square metres', () => {
    expect(toSqm(1245, 'sq ft')).toBeCloseTo(115.66, 1);
    expect(toSqm(1, 'ha')).toBe(10000);
    expect(toSqm('2', 'acre')).toBeCloseTo(8093.72, 1);
    expect(toSqm(100, 'sqm')).toBe(100);
  });
  it('returns 0 for garbage', () => {
    expect(toSqm('', 'sqm')).toBe(0);
    expect(toSqm('abc', 'sq ft')).toBe(0);
  });
});

describe('showBlocks conditional form', () => {
  it('apartment needs the full parcel→unit chain', () => {
    expect(showBlocks('Apartment / Flat')).toEqual(
      { parcel: true, building: true, floor: true, unit: true, utility: false });
  });
  it('land parcel skips building/floor/unit', () => {
    const b = showBlocks('Land Parcel');
    expect(b.parcel).toBe(true);
    expect(b.building || b.floor || b.unit).toBe(false);
  });
  it('underground asset shows only the utility block', () => {
    expect(showBlocks('Underground Asset')).toEqual(
      { parcel: true, building: false, floor: false, unit: false, utility: true });
  });
});

describe('submission status metadata', () => {
  it('covers every backend status', () => {
    for (const s of ['DRAFT', 'PENDING_VERIFICATION', 'UNDER_VERIFICATION', 'FIELD_CHECK',
                     'CORRECTION_REQUIRED', 'APPROVED', 'REJECTED', 'INTEGRATED', 'NEEDS_REVIEW'])
      expect(STATUS_META[s].label.length).toBeGreaterThan(0);
  });
  it('every area row maps to at least one property type', () => {
    for (const r of AREA_ROWS) expect(r.types.length).toBeGreaterThan(0);
  });
});
