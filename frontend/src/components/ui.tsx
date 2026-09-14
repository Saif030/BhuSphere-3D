import React from 'react';
function thresholds() {
  try { const t = JSON.parse(localStorage.getItem('bhu_thresholds') || '{}');
    return { verified: +t.verified || 95, high: +t.high || 80, review: +t.review || 60 }; }
  catch { return { verified: 95, high: 80, review: 60 }; }
}
export function ConfidenceRing({ value, size = 92 }: { value: number; size?: number }) {
  const r = (size - 12) / 2, c = 2 * Math.PI * r;
  const th = thresholds();
  const col = value >= th.verified ? '#138808' : value >= th.high ? '#1A3A6B' : value >= th.review ? '#E87722' : '#dc2626';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#e2e8f0" strokeWidth={9} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={col} strokeWidth={9} fill="none"
          strokeDasharray={c} strokeDashoffset={c - (c * value) / 100} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div className="absolute text-center"><div className="font-bold text-slate-900">{value.toFixed(1)}%</div>
      <div className="text-[10px] text-slate-500">confidence</div></div>
    </div>
  );
}
export function StatusBadge({ s }: { s: string }) {
  const m: any = {
    Verified: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'High Confidence': 'bg-blue-50 text-gov-navy border border-blue-200',
    'Needs Review': 'bg-amber-50 text-amber-700 border border-amber-200',
    Unverified: 'bg-red-50 text-red-700 border border-red-200',
    Open: 'bg-amber-50 text-amber-700 border border-amber-200',
    Resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'Under Review': 'bg-blue-50 text-gov-navy border border-blue-200',
    Rejected: 'bg-slate-100 text-slate-500 border border-slate-200',
    High: 'bg-red-50 text-red-700 border border-red-200',
    Medium: 'bg-amber-50 text-amber-700 border border-amber-200',
    Low: 'bg-blue-50 text-gov-navy border border-blue-200',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${m[s] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>{s}</span>;
}
