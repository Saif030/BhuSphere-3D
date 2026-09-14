/** Central content for the public portal (GIGW-style). Single source for nav/services/FAQ/notices. */

export const PORTAL_META = {
  name: 'BhuSphere 3D',
  hindi: 'भू-क्षेत्र 3D',
  tagline: 'Vertical Property Mapping & Spatial Governance',
  programme: 'SIH 2026 · Problem Statement 26011 · Prototype',
  disclaimer:
    'Prototype identifiers are demo references — not official Government of India ULPINs.',
};

export const PUBLIC_NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About Us' },
  { to: '/services', label: 'Services' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/verify', label: 'Verify Property' },
  { to: '/help', label: 'Help / FAQ' },
  { to: '/contact', label: 'Contact Us' },
];

export const SERVICES = [
  {
    to: '/verify',
    icon: 'ShieldCheck',
    title: 'Verify Property Identity',
    desc: 'Check a property reference / ULPIN and view its public digital identity with QR.',
  },
  {
    to: '/login?role=citizen',
    icon: 'ClipboardEdit',
    title: 'Submit Property Data',
    desc: 'Property owners can submit or update property information for verification.',
  },
  {
    to: '/login?role=citizen',
    icon: 'Track',
    title: 'Track Submission',
    desc: 'Follow your submission from validation to officer approval with a live timeline.',
  },
  {
    to: '/login',
    icon: 'Map',
    title: 'Explore 2D Cadastral Map',
    desc: 'View parcels, buildings and underground utilities on the jurisdictional map.',
  },
  {
    to: '/login',
    icon: 'Box',
    title: 'View 3D Property Stack',
    desc: 'Parcel → building → floor → unit as spatial volumes with verified heights.',
  },
  {
    to: '/help',
    icon: 'Help',
    title: 'Helpdesk & Guides',
    desc: 'Step-by-step guides, FAQs and support for citizens and departments.',
  },
];

export const STEPS_CITIZEN = [
  { n: '1', title: 'Submit', desc: 'Owner submits property details + supporting documents (if available).' },
  { n: '2', title: 'Auto validation', desc: 'System checks geometry, measurements, duplicates and evidence.' },
  { n: '3', title: 'Officer verification', desc: 'Authorised officer reviews, may request field check or correction.' },
  { n: '4', title: 'Approved record', desc: 'On approval the verified record becomes part of the cadastre.' },
];

export const NOTICES = [
  { date: '2026-09-01', title: 'Demo dataset “Green Residency” available for 2D → 3D walkthrough', tag: 'Demo' },
  { date: '2026-08-22', title: 'DILRMP 3.0 operational guidelines (2026–2031) referenced for land-records workflow', tag: 'Policy' },
  { date: '2026-08-10', title: 'Bhu-Aadhaar (ULPIN) explainer added to Help — prototype vs official IDs', tag: 'ULPIN' },
];

export const FAQS = [
  {
    q: 'Is this an official Government of India website?',
    a: 'No. This is a Smart India Hackathon 2026 prototype inspired by DILRMP / Bhu-Naksha / ULPIN concepts. All parcel, building and ULPIN-like identifiers are synthetic demo references.',
  },
  {
    q: 'What is ULPIN / Bhu-Aadhaar?',
    a: 'ULPIN (Bhu-Aadhaar) is a 14-digit Unique Land Parcel Identification Number under DILRMP, based on geo-referenced cadastral maps. In this prototype we use longer demo references (e.g. DL-SKT-0182-B01-F08-U804) to show parcel → building → floor → unit stacking in 3D.',
  },
  {
    q: 'I am a property owner. What can I do here?',
    a: 'Sign in as Property Owner / Citizen (demo password demo123), submit your property data, upload supporting documents, and track verification. Your submission stays “unverified claim” until an officer approves it.',
  },
  {
    q: 'Does submitting here establish legal ownership?',
    a: 'No. Neither the form nor any AI output establishes legal title. Ownership details are claims pending verification against authoritative records.',
  },
  {
    q: 'What can a public visitor do without login?',
    a: 'Browse Home, About, Services, How It Works, verify a public property identity via reference/QR, and contact the helpdesk. Map/3D workspaces need a signed-in demo role.',
  },
  {
    q: 'Which browsers / accessibility features are supported?',
    a: 'Modern browsers, keyboard navigation, visible focus, skip-to-content link, and reduced-motion support. Text sizing follows the browser (A+ / A / A− pattern from GIGW).',
  },
  {
    q: 'Where does the map data come from?',
    a: 'A small synthetic demo dataset (parcels, Green Residency towers, utilities) served by the prototype backend. City-scale numbers on staff dashboards are illustrative; use “Live demo” toggle for real demo counts.',
  },
  {
    q: 'Who do I contact for help?',
    a: 'Use the Contact Us page helpdesk card. In this demo, queries are stored locally in your browser — no real grievance is filed.',
  },
];
