/** Shared helpers for the Property Data Submission intake flow. */

export const SQM_PER_UNIT: Record<string, number> = {
  'sqm': 1, 'm²': 1, 'sq ft': 1 / 10.7639, 'sqft': 1 / 10.7639,
  'ha': 10000, 'acre': 4046.86,
};
export const AREA_UNITS = ['sqm', 'sq ft', 'ha', 'acre'];

export function toSqm(value: any, unit: string): number {
  const v = parseFloat(value);
  if (isNaN(v)) return 0;
  return v * (SQM_PER_UNIT[unit] ?? 1);
}

export const PROPERTY_TYPES = [
  'Land Parcel', 'Residential House', 'Apartment / Flat', 'Residential Building',
  'Commercial Property', 'Commercial Unit', 'Industrial Property', 'Government Property',
  'Parking', 'Basement', 'Mixed Use', 'Underground Asset', 'Other',
];

export const WIZARD_STEPS = [
  'Source', 'Intent', 'Property & Location', 'Measurements',
  'Ownership', 'Documents', 'Review & Submit',
];

export type Blocks = { parcel: boolean; building: boolean; floor: boolean; unit: boolean; utility: boolean };

/** Conditional form behavior (§27): which blocks a property type needs. */
export function showBlocks(t: string): Blocks {
  switch (t) {
    case 'Land Parcel': return { parcel: true, building: false, floor: false, unit: false, utility: false };
    case 'Apartment / Flat':
    case 'Commercial Unit':
    case 'Parking':
    case 'Basement': return { parcel: true, building: true, floor: true, unit: true, utility: false };
    case 'Residential Building':
    case 'Commercial Property':
    case 'Industrial Property':
    case 'Government Property':
    case 'Mixed Use': return { parcel: true, building: true, floor: false, unit: false, utility: false };
    case 'Residential House': return { parcel: true, building: true, floor: true, unit: false, utility: false };
    case 'Underground Asset': return { parcel: true, building: false, floor: false, unit: false, utility: true };
    default: return { parcel: true, building: true, floor: true, unit: true, utility: false };
  }
}

export const AREA_ROWS: { key: string; label: string; types: string[] }[] = [
  { key: 'plot_area', label: 'Plot / Parcel Area', types: ['Land Parcel', 'Residential House', 'Residential Building', 'Commercial Property', 'Industrial Property', 'Government Property', 'Mixed Use', 'Other'] },
  { key: 'carpet_area', label: 'Carpet Area', types: ['Apartment / Flat', 'Commercial Unit', 'Residential House', 'Mixed Use', 'Other'] },
  { key: 'builtup_area', label: 'Built-up Area', types: ['Apartment / Flat', 'Commercial Unit', 'Residential House', 'Residential Building', 'Commercial Property', 'Industrial Property', 'Mixed Use', 'Other'] },
  { key: 'super_builtup_area', label: 'Super Built-up Area', types: ['Apartment / Flat', 'Commercial Unit', 'Mixed Use', 'Other'] },
  { key: 'floor_area', label: 'Floor Area', types: ['Residential Building', 'Commercial Property', 'Industrial Property', 'Government Property', 'Mixed Use'] },
  { key: 'unit_area', label: 'Unit Area', types: ['Apartment / Flat', 'Commercial Unit', 'Parking', 'Basement'] },
  { key: 'common_area', label: 'Common Area', types: ['Apartment / Flat', 'Commercial Unit', 'Residential Building', 'Mixed Use'] },
  { key: 'parking_area', label: 'Parking Area', types: ['Apartment / Flat', 'Commercial Unit', 'Residential House', 'Commercial Property', 'Parking', 'Mixed Use'] },
];

export const STATUS_META: Record<string, { label: string; cls: string; desc: string }> = {
  DRAFT: { label: 'Draft', cls: 'bg-slate-100 text-slate-600 border border-slate-200', desc: 'Not submitted yet.' },
  PENDING_VERIFICATION: { label: 'Pending Verification', cls: 'bg-amber-50 text-amber-700 border border-amber-200', desc: 'Awaiting officer review.' },
  UNDER_VERIFICATION: { label: 'Under Verification', cls: 'bg-blue-50 text-gov-navy border border-blue-200', desc: 'An officer is reviewing it.' },
  FIELD_CHECK: { label: 'Field Check', cls: 'bg-violet-50 text-violet-700 border border-violet-200', desc: 'Surveyor field verification in progress.' },
  CORRECTION_REQUIRED: { label: 'Correction Required', cls: 'bg-orange-50 text-orange-700 border border-orange-200', desc: 'Please fix the flagged fields and resubmit.' },
  APPROVED: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', desc: 'Verified and accepted.' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-50 text-red-700 border border-red-200', desc: 'Not accepted. Kept in history.' },
  INTEGRATED: { label: 'Integrated', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', desc: 'Live in the cadastral system.' },
  NEEDS_REVIEW: { label: 'Needs Review', cls: 'bg-amber-50 text-amber-700 border border-amber-200', desc: 'Technical inconsistencies found.' },
  SUBMITTED: { label: 'Submitted', cls: 'bg-blue-50 text-gov-navy border border-blue-200', desc: 'Received by the system.' },
};
