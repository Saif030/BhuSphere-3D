import { describe, it, expect } from 'vitest';
import { parseUlpin, unit3DUrl, entity3DLink } from './nav';

describe('parseUlpin', () => {
  it('splits a flagship ULPIN into hierarchy', () => {
    expect(parseUlpin('DL-SKT-0182-B01-F08-U804')).toEqual({
      parcel: 'DL-SKT-0182', bkey: 'DL-SKT-0182-B01',
      floor: 'DL-SKT-0182-B01-F08', unit: 'DL-SKT-0182-B01-F08-U804',
    });
  });
  it('rejects malformed references', () => {
    expect(parseUlpin('DL-SKT-0182')).toBeNull();
    expect(parseUlpin('')).toBeNull();
  });
});

describe('unit3DUrl', () => {
  it('deep-links a unit into tower + floor + unit', () => {
    expect(unit3DUrl('DL-SKT-0182-B01-F08-U804'))
      .toBe('/3d?b=DL-SKT-0182-B01&f=DL-SKT-0182-B01-F08&u=DL-SKT-0182-B01-F08-U804');
  });
});

describe('entity3DLink', () => {
  it('links buildings and floors, ignores parcels/utilities', () => {
    expect(entity3DLink('DL-SKT-0182-B03')).toBe('/3d?b=DL-SKT-0182-B03');
    expect(entity3DLink('DL-SKT-0182-B01-F08')).toBe('/3d?b=DL-SKT-0182-B01&f=DL-SKT-0182-B01-F08');
    expect(entity3DLink('DL-SKT-0182')).toBeNull();
    expect(entity3DLink('WTR-00182')).toBeNull();
  });
});
