/** Guided demo-tour script. Each step navigates (deep links do the heavy lifting)
 *  and spotlights one anchor. The `action` runs on arrival: 'copilot-ask' fires the
 *  flagship AI query so highlights appear on the map without typing. */

export type TourAction = 'none' | 'copilot-ask';
export type TourStep = { route: string; anchor: string; title: string; text: string; action: TourAction };

export const COPILOT_DEMO_Q = 'Show buildings with height mismatch greater than 2m';

const STEPS: { route: string; anchor: string; action: TourAction; en: [string, string]; hi: [string, string] }[] = [
  { route: '/dashboard', anchor: 'tour-kpis', action: 'none',
    en: ['1 · Staff register (staff only)',
      'Illustrative city-scale register with a City/Live toggle. Citizens never see this — they get a service portal instead.'],
    hi: ['1 · स्टाफ रजिस्टर (केवल स्टाफ)',
      'शहर/लाइव टॉगल सहित सचित्र शहर-स्तरीय रजिस्टर। नागरिक इसे कभी नहीं देखते — उन्हें सेवा पोर्टल मिलता है।'] },
  { route: '/map?q=Green%20Residency', anchor: 'tour-search', action: 'none',
    en: ['2 · Find the flagship',
      'Search runs across ULPINs, parcels, buildings and utilities. Results are already loaded — click Building A in the drawer or on the map.'],
    hi: ['2 · फ्लैगशिप खोजें',
      'खोज ULPIN, पार्सल, भवन और उपयोगिताओं में चलती है। परिणाम पहले से लोड हैं — ड्रॉअर या मानचित्र में Building A पर क्लिक करें।'] },
  { route: '/3d?b=DL-SKT-0182-B01', anchor: 'tour-3d', action: 'none',
    en: ['3 · 2D → 3D tower',
      'One click jumps from the 2D parcel into the interactive tower: basements B2/B1, ground, and 12 floors as separate spatial volumes.'],
    hi: ['3 · 2D → 3D टावर',
      'एक क्लिक में 2D पार्सल से इंटरैक्टिव टावर में जाएं: बेसमेंट B2/B1, भूतल और 12 तल अलग स्थानिक आयतन के रूप में।'] },
  { route: '/3d?b=DL-SKT-0182-B01&f=DL-SKT-0182-B01-F08&u=DL-SKT-0182-B01-F08-U804', anchor: 'tour-rail', action: 'none',
    en: ['4 · Exploded floor + unit volume',
      'Floor F08 separates symmetrically — uniform gaps, no overlap, even on the top floor. Unit 804 shows its prototype ULPIN, area, z-range and 96.4% confidence.'],
    hi: ['4 · विस्फोटित तल + इकाई आयतन',
      'तल F08 सममित रूप से अलग होता है — समान अंतराल, कोई अतिव्यापन नहीं, शीर्ष तल पर भी। इकाई 804 अपना प्रोटोटाइप ULPIN, क्षेत्र, z-परास और 96.4% विश्वास दिखाती है।'] },
  { route: '/3d?b=DL-SKT-0182-B01&f=DL-SKT-0182-B01-F08&u=DL-SKT-0182-B01-F08-U804&iso=1', anchor: 'tour-isolate', action: 'none',
    en: ['5 · Isolated floor, every room tagged',
      '“View floor in 3D” isolates the slab with all rooms, each carrying its number tag. Click any room for its property record.'],
    hi: ['5 · पृथक तल, प्रत्येक कमरा टैग्ड',
      '“तल 3D में देखें” सभी कमरों सहित स्लैब को अलग करता है, प्रत्येक पर संख्या टैग। संपत्ति अभिलेख हेतु किसी कमरे पर क्लिक करें।'] },
  { route: '/map', anchor: 'tour-copilot', action: 'copilot-ask',
    en: ['6 · AI copilot drives the map',
      'Ask in plain language — the copilot answers with counts, tables and live map highlights. Watch it find every height mismatch now.'],
    hi: ['6 · AI सहायक मानचित्र चलाता है',
      'सरल भाषा में पूछें — सहायक गणना, तालिकाओं और लाइव मानचित्र हाइलाइट के साथ उत्तर देता है। देखें यह प्रत्येक ऊंचाई अंतर कैसे खोजता है।'] },
  { route: '/validation', anchor: 'tour-validation', action: 'none',
    en: ['7 · Validation Center',
      'Every finding carries severity, evidence, AI confidence and a fix action. Open the B03 case file for the full story.'],
    hi: ['7 · सत्यापन केंद्र',
      'प्रत्येक निष्कर्ष में गंभीरता, साक्ष्य, AI विश्वास और सुधार कार्रवाई है। पूरी कथा हेतु B03 केस फ़ाइल खोलें।'] },
  { route: '/validation/case/DL-SKT-0182-B03', anchor: 'tour-case', action: 'none',
    en: ['8 · The B03 case file',
      'Registered 29.4 m vs LiDAR 32.8 m — a +3.4 m gap, evidence chain, history and a live audit trail. Resolve it and watch trust being written. Tour complete.'],
    hi: ['8 · B03 केस फ़ाइल',
      'पंजीकृत 29.4 मी. बनाम LiDAR 32.8 मी. — +3.4 मी. अंतर, साक्ष्य श्रृंखला, इतिहास और लाइव ऑडिट ट्रेल। समाधान करें और विश्वास लिखते देखें। भ्रमण पूर्ण।'] },
];

export function tourSteps(lang: 'en' | 'hi'): TourStep[] {
  return STEPS.map((s) => ({ route: s.route, anchor: s.anchor, action: s.action, title: lang === 'hi' ? s.hi[0] : s.en[0], text: lang === 'hi' ? s.hi[1] : s.en[1] }));
}

/** Back-compat for existing imports. */
export const TOUR_STEPS: TourStep[] = tourSteps('en');
