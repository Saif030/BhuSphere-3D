/** Guided demo-tour script. Each step navigates (deep links do the heavy lifting)
 *  and spotlights one anchor. The `action` runs on arrival: 'copilot-ask' fires the
 *  flagship AI query so highlights appear on the map without typing. */

export type TourAction = 'none' | 'copilot-ask';
export type TourStep = { route: string; anchor: string; title: string; text: string; action: TourAction };

export const COPILOT_DEMO_Q = 'Show buildings with height mismatch greater than 2m';

export const TOUR_STEPS: TourStep[] = [
  { route: '/', anchor: 'tour-kpis', title: '1 · City-scale register',
    text: '12,482 parcels · 3,428 buildings · 18,764 units · 214 spatial conflicts · 94.2% confidence. Toggle City/Live to see the demo dataset underneath.',
    action: 'none' },
  { route: '/map?q=Green%20Residency', anchor: 'tour-search', title: '2 · Find the flagship',
    text: 'Search runs across ULPINs, parcels, buildings and utilities. Results are already loaded — click Building A in the drawer or on the map.',
    action: 'none' },
  { route: '/3d?b=DL-SKT-0182-B01', anchor: 'tour-3d', title: '3 · 2D → 3D tower',
    text: 'One click jumps from the 2D parcel into the interactive tower: basements B2/B1, ground, and 12 floors as separate spatial volumes.',
    action: 'none' },
  { route: '/3d?b=DL-SKT-0182-B01&f=DL-SKT-0182-B01-F08&u=DL-SKT-0182-B01-F08-U804', anchor: 'tour-rail',
    title: '4 · Exploded floor + unit volume',
    text: 'Floor F08 separates symmetrically — uniform gaps, no overlap, even on the top floor. Unit 804 shows its prototype ULPIN, area, z-range and 96.4% confidence.',
    action: 'none' },
  { route: '/3d?b=DL-SKT-0182-B01&f=DL-SKT-0182-B01-F08&u=DL-SKT-0182-B01-F08-U804&iso=1', anchor: 'tour-isolate',
    title: '5 · Isolated floor, every room tagged',
    text: '“View floor in 3D” isolates the slab with all rooms, each carrying its number tag. Click any room for its property record.',
    action: 'none' },
  { route: '/map', anchor: 'tour-copilot', title: '6 · AI copilot drives the map',
    text: 'Ask in plain language — the copilot answers with counts, tables and live map highlights. Watch it find every height mismatch now.',
    action: 'copilot-ask' },
  { route: '/validation', anchor: 'tour-validation', title: '7 · Validation Center',
    text: 'Every finding carries severity, evidence, AI confidence and a fix action. Open the B03 case file for the full story.',
    action: 'none' },
  { route: '/validation/case/DL-SKT-0182-B03', anchor: 'tour-case', title: '8 · The B03 case file',
    text: 'Registered 29.4 m vs LiDAR 32.8 m — a +3.4 m gap, evidence chain, history and a live audit trail. Resolve it and watch trust being written. Tour complete.',
    action: 'none' },
];
