/** Shared deep-link helpers for prototype ULPINs like DL-SKT-0182-B01-F08-U804. */

export function parseUlpin(ulpin: string) {
  const p = (ulpin || '').split('-');
  if (p.length < 6 || !/-U\d+$/.test(ulpin)) return null;
  return {
    parcel: p.slice(0, 3).join('-'),
    bkey: p.slice(0, 4).join('-'),
    floor: p.slice(0, 5).join('-'),
    unit: ulpin,
  };
}

/** 3D tower URL for a unit, or null when the reference is malformed. */
export function unit3DUrl(ulpin: string): string | null {
  const p = parseUlpin(ulpin);
  return p ? `/3d?b=${p.bkey}&f=${p.floor}&u=${p.unit}` : null;
}

/** Deep link a validation/AI entity id into the 3D tower (unit/building/floor) or null. */
export function entity3DLink(eid: string): string | null {
  if (!eid) return null;
  if (/-U\d+$/.test(eid)) return unit3DUrl(eid);
  if (/^DL-[A-Z]+-\d+-B\d+(-F\d+|-G|-B\d+)?$/.test(eid)) {
    const p = eid.split('-');
    const b = p.slice(0, 4).join('-');
    return p.length > 4 ? `/3d?b=${b}&f=${eid}` : `/3d?b=${b}`;
  }
  return null;
}
