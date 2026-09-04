import React from 'react';
export function ConfidenceRing({ value, size = 92 }: { value: number; size?: number }) {
  const r = (size - 12) / 2, c = 2 * Math.PI * r;
  const col = value >= 95 ? '#16a34a' : value >= 80 ? '#2563eb' : value >= 60 ? '#d97706' : '#dc2626';
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
  const m: any = { Verified: 'bg-green-100 text-green-800', 'High Confidence': 'bg-blue-100 text-blue-800',
    'Needs Review': 'bg-amber-100 text-amber-800', Unverified: 'bg-red-100 text-red-800', Open: 'bg-amber-100 text-amber-800',
    Resolved: 'bg-green-100 text-green-800', 'Under Review': 'bg-blue-100 text-blue-800', Rejected: 'bg-slate-200 text-slate-700' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m[s] || 'bg-slate-100 text-slate-700'}`}>{s}</span>;
}
