/** Central content for the public portal (GIGW-style). Bilingual: pick via portalContent(lang). */
import type { Lang } from './i18n';

export const PORTAL_META = {
  name: 'BhuSphere 3D',
  hindi: 'भू-क्षेत्र 3D',
  tagline: 'Vertical Property Mapping & Spatial Governance',
  programme: 'SIH 2026 · Problem Statement 26011 · Prototype',
  disclaimer:
    'Prototype identifiers are demo references — not official Government of India ULPINs.',
};

const TAGLINE_HI = 'त्रि-आयामी संपत्ति मानचित्रण एवं स्थानिक शासन';
const DISCLAIMER_HI = 'प्रोटोटाइप पहचानकर्ता डेमो संदर्भ हैं — भारत सरकार के आधिकारिक ULPIN नहीं।';

export const PUBLIC_NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About Us' },
  { to: '/services', label: 'Services' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/verify', label: 'Verify Property' },
  { to: '/help', label: 'Help / FAQ' },
  { to: '/contact', label: 'Contact Us' },
];

const PUBLIC_NAV_HI = [
  { to: '/', label: 'होम', end: true },
  { to: '/about', label: 'हमारे बारे में' },
  { to: '/services', label: 'सेवाएं' },
  { to: '/how-it-works', label: 'यह कैसे काम करता है' },
  { to: '/verify', label: 'संपत्ति सत्यापित करें' },
  { to: '/help', label: 'सहायता / सामान्य प्रश्न' },
  { to: '/contact', label: 'संपर्क करें' },
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
    to: '/login?next=/map',
    icon: 'Map',
    title: 'Explore 2D Cadastral Map',
    desc: 'View parcels, buildings and underground utilities on the jurisdictional map.',
  },
  {
    to: '/login?next=/3d',
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

const SERVICES_HI = [
  {
    to: '/verify',
    icon: 'ShieldCheck',
    title: 'संपत्ति पहचान सत्यापित करें',
    desc: 'संपत्ति संदर्भ / ULPIN जांचें और QR सहित सार्वजनिक डिजिटल पहचान देखें।',
  },
  {
    to: '/login?role=citizen',
    icon: 'ClipboardEdit',
    title: 'संपत्ति डेटा जमा करें',
    desc: 'संपत्ति स्वामी सत्यापन हेतु संपत्ति जानकारी जमा या अद्यतन कर सकते हैं।',
  },
  {
    to: '/login?role=citizen',
    icon: 'Track',
    title: 'आवेदन ट्रैक करें',
    desc: 'लाइव टाइमलाइन के साथ मान्यता से अधिकारी अनुमोदन तक अपना आवेदन देखें।',
  },
  {
    to: '/login?next=/map',
    icon: 'Map',
    title: '2D भू-मानचित्र एक्सप्लोर करें',
    desc: 'क्षेत्राधिकार मानचित्र पर पार्सल, भवन और भूमिगत उपयोगिताएं देखें।',
  },
  {
    to: '/login?next=/3d',
    icon: 'Box',
    title: '3D संपत्ति संरचना देखें',
    desc: 'सत्यापित ऊंचाइयों सहित स्थानिक आयतन के रूप में पार्सल → भवन → तल → इकाई।',
  },
  {
    to: '/help',
    icon: 'Help',
    title: 'हेल्पडेस्क व मार्गदर्शिकाएं',
    desc: 'नागरिकों व विभागों हेतु चरणबद्ध मार्गदर्शिकाएं, सामान्य प्रश्न और सहायता।',
  },
];

export const STEPS_CITIZEN = [
  { n: '1', title: 'Submit', desc: 'Owner submits property details + supporting documents (if available).' },
  { n: '2', title: 'Auto validation', desc: 'System checks geometry, measurements, duplicates and evidence.' },
  { n: '3', title: 'Officer verification', desc: 'Authorised officer reviews, may request field check or correction.' },
  { n: '4', title: 'Approved record', desc: 'On approval the verified record becomes part of the cadastre.' },
];

const STEPS_CITIZEN_HI = [
  { n: '1', title: 'जमा करें', desc: 'स्वामी संपत्ति विवरण + सहायक दस्तावेज़ (यदि उपलब्ध) जमा करता है।' },
  { n: '2', title: 'स्वतः मान्यता', desc: 'सिस्टम ज्यामिति, माप, डुप्लिकेट और साक्ष्य जांचता है।' },
  { n: '3', title: 'अधिकारी सत्यापन', desc: 'अधिकृत अधिकारी समीक्षा करता है, क्षेत्र जांच या सुधार मांग सकता है।' },
  { n: '4', title: 'अनुमोदित अभिलेख', desc: 'अनुमोदन पर सत्यापित अभिलेख भू-मानचित्र का भाग बनता है।' },
];

export const STEPS_OFFICER = [
  { n: '1', title: 'Department submit', desc: 'Authorised officer/surveyor submits with department name.' },
  { n: '2', title: 'Auto validation', desc: 'Technical checks run; record integrates or flags Needs Review.' },
  { n: '3', title: 'Queue (citizen only)', desc: 'Department sources never enter the citizen verification queue.' },
  { n: '4', title: 'Audit + reports', desc: 'Every action writes to the audit trail and reports.' },
];

const STEPS_OFFICER_HI = [
  { n: '1', title: 'विभागीय प्रविष्टि', desc: 'अधिकृत अधिकारी/सर्वेक्षक विभाग नाम सहित जमा करता है।' },
  { n: '2', title: 'स्वतः मान्यता', desc: 'तकनीकी जांच चलती है; अभिलेख एकीकृत होता या समीक्षा हेतु चिह्नित होता है।' },
  { n: '3', title: 'कतार (केवल नागरिक)', desc: 'विभागीय स्रोत कभी नागरिक सत्यापन कतार में नहीं जाते।' },
  { n: '4', title: 'ऑडिट + रिपोर्ट', desc: 'प्रत्येक कार्रवाई ऑडिट ट्रेल और रिपोर्ट में दर्ज होती है।' },
];

export const NOTICES = [
  { date: '2026-09-01', title: 'Demo dataset “Green Residency” available for 2D → 3D walkthrough', tag: 'Demo' },
  { date: '2026-08-22', title: 'DILRMP 3.0 operational guidelines (2026–2031) referenced for land-records workflow', tag: 'Policy' },
  { date: '2026-08-10', title: 'Bhu-Aadhaar (ULPIN) explainer added to Help — prototype vs official IDs', tag: 'ULPIN' },
];

const NOTICES_HI = [
  { date: '2026-09-01', title: '2D → 3D वॉकथ्रू हेतु डेमो डेटासेट “ग्रीन रेजीडेंसी” उपलब्ध', tag: 'डेमो' },
  { date: '2026-08-22', title: 'भू-अभिलेख कार्यप्रवाह हेतु DILRMP 3.0 परिचालन मार्गनिर्देश (2026–2031) संदर्भित', tag: 'नीति' },
  { date: '2026-08-10', title: 'सहायता में भू-आधार (ULPIN) व्याख्याता जोड़ा गया — प्रोटोटाइप बनाम आधिकारिक ID', tag: 'ULPIN' },
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

const FAQS_HI = [
  {
    q: 'क्या यह भारत सरकार की आधिकारिक वेबसाइट है?',
    a: 'नहीं। यह DILRMP / भू-नक्शा / ULPIN अवधारणाओं से प्रेरित स्मार्ट इंडिया हैकाथॉन 2026 प्रोटोटाइप है। सभी पार्सल, भवन और ULPIN-सदृश पहचानकर्ता कृत्रिम डेमो संदर्भ हैं।',
  },
  {
    q: 'ULPIN / भू-आधार क्या है?',
    a: 'ULPIN (भू-आधार) DILRMP के अंतर्गत 14-अंकीय विशिष्ट भूमि पार्सल पहचान संख्या है, जो भू-संदर्भित भू-मानचित्रों पर आधारित है। इस प्रोटोटाइप में 3D में पार्सल → भवन → तल → इकाई स्तरण दिखाने हेतु लंबे डेमो संदर्भ (जैसे DL-SKT-0182-B01-F08-U804) प्रयोग होते हैं।',
  },
  {
    q: 'मैं संपत्ति स्वामी हूं। मैं यहां क्या कर सकता हूं?',
    a: 'संपत्ति स्वामी / नागरिक के रूप में साइन इन करें (डेमो पासवर्ड demo123), अपना संपत्ति डेटा जमा करें, सहायक दस्तावेज़ अपलोड करें और सत्यापन ट्रैक करें। अधिकारी अनुमोदन तक आपका आवेदन “असत्यापित दावा” रहता है।',
  },
  {
    q: 'क्या यहां जमा करने से कानूनी स्वामित्व स्थापित होता है?',
    a: 'नहीं। न यह फ़ॉर्म, न कोई AI आउटपुट कानूनी स्वामित्व स्थापित करता है। स्वामित्व विवरण आधिकारिक अभिलेखों से सत्यापन लंबित दावे हैं।',
  },
  {
    q: 'बिना लॉगिन सार्वजनिक आगंतुक क्या कर सकता है?',
    a: 'होम, हमारे बारे में, सेवाएं, यह कैसे काम करता है देखें, संदर्भ/QR से सार्वजनिक संपत्ति पहचान सत्यापित करें और हेल्पडेस्क से संपर्क करें। मानचित्र/3D कार्यक्षेत्र हेतु साइन-इन डेमो भूमिका चाहिए।',
  },
  {
    q: 'कौन-से ब्राउज़र / सुगमता सुविधाएं समर्थित हैं?',
    a: 'आधुनिक ब्राउज़र, कीबोर्ड नेविगेशन, दृश्य फोकस, मुख्य-सामग्री पर जाएं लिंक और reduced-motion समर्थन। पाठ आकार ब्राउज़र का अनुसरण करता है (GIGW का A+ / A / A− पैटर्न)।',
  },
  {
    q: 'मानचित्र डेटा कहां से आता है?',
    a: 'प्रोटोटाइप बैकएंड से प्राप्त छोटा कृत्रिम डेमो डेटासेट (पार्सल, ग्रीन रेजीडेंसी टावर, उपयोगिताएं)। स्टाफ डैशबोर्ड पर शहर-स्तरीय संख्याएं सचित्र हैं; वास्तविक डेमो गणना हेतु “लाइव डेमो” टॉगल प्रयोग करें।',
  },
  {
    q: 'सहायता हेतु किससे संपर्क करूं?',
    a: 'संपर्क पृष्ठ के हेल्पडेस्क कार्ड का प्रयोग करें। इस डेमो में पूछताछ आपके ब्राउज़र में स्थानीय रूप से संग्रहित होती है — कोई वास्तविक शिकायत दर्ज नहीं होती।',
  },
];

/** Language-aware portal content. Call with the current lang. */
export function portalContent(lang: Lang) {
  const hi = lang === 'hi';
  return {
    meta: hi
      ? { ...PORTAL_META, tagline: TAGLINE_HI, disclaimer: DISCLAIMER_HI }
      : PORTAL_META,
    nav: hi ? PUBLIC_NAV_HI : PUBLIC_NAV,
    services: hi ? SERVICES_HI : SERVICES,
    stepsCitizen: hi ? STEPS_CITIZEN_HI : STEPS_CITIZEN,
    stepsOfficer: hi ? STEPS_OFFICER_HI : STEPS_OFFICER,
    notices: hi ? NOTICES_HI : NOTICES,
    faqs: hi ? FAQS_HI : FAQS,
  };
}
