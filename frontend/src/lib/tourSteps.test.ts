import { describe, it, expect } from 'vitest';
import { TOUR_STEPS } from './tourSteps';

describe('demo tour script', () => {
  it('has 8 ordered steps with valid routes, anchors and actions', () => {
    expect(TOUR_STEPS).toHaveLength(8);
    const anchors = new Set<string>();
    for (const s of TOUR_STEPS) {
      expect(s.route.startsWith('/')).toBe(true);
      expect(s.anchor.startsWith('tour-')).toBe(true);
      expect(anchors.has(s.anchor)).toBe(false);
      anchors.add(s.anchor);
      expect(['none', 'copilot-ask']).toContain(s.action);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.text.length).toBeGreaterThan(20);
    }
  });
  it('opens on the dashboard and finales on the B03 case file', () => {
    expect(TOUR_STEPS[0].route).toBe('/');
    expect(TOUR_STEPS[TOUR_STEPS.length - 1].route).toBe('/validation/case/DL-SKT-0182-B03');
  });
  it('deep-links carry building/floor/unit params into the 3D viewer', () => {
    const s3 = TOUR_STEPS[3];
    expect(s3.route).toContain('b=DL-SKT-0182-B01');
    expect(s3.route).toContain('f=DL-SKT-0182-B01-F08');
    expect(s3.route).toContain('u=DL-SKT-0182-B01-F08-U804');
    expect(TOUR_STEPS[4].route).toContain('iso=1');
  });
});
