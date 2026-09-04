import React from 'react';
function thresholds() {
  try { const t = JSON.parse(localStorage.getItem('bhu_thresholds') || '{}');
    return { verified: +t.verified || 95, high: +t.high || 80, review: +t.review || 60 }; }
  catch { return { verified: 95, high: 80, review: 60 }; }
}
export function ConfidenceRing({ value, size = 92 }: { value: number; size?: number }) {
  const r = (size - 12) / 2, c = 2 * Math.PI * r;
  const th = thresholds();
  const col = value >= th.verified ? '#34d399' : value >= th.high ? '#38bdf8' : value >= th.review ? '#fbbf24' : '#f87171';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,.12)" strokeWidth={9} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={col} strokeWidth={9} fill="none"
          strokeDasharray={c} strokeDashoffset={c - (c * value) / 100} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div className="absolute text-center"><div className="font-bold text-white">{value.toFixed(1)}%</div>
      <div className="text-[10px] text-slate-400">confidence</div></div>
    </div>
  );
}
export function StatusBadge({ s }: { s: string }) {
  const m: any = {
    Verified: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30',
    'High Confidence': 'bg-sky-400/10 text-sky-300 border border-sky-400/30',
    'Needs Review': 'bg-amber-400/10 text-amber-300 border border-amber-400/30',
    Unverified: 'bg-red-400/10 text-red-300 border border-red-400/30',
    Open: 'bg-amber-400/10 text-amber-300 border border-amber-400/30',
    Resolved: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30',
    'Under Review': 'bg-sky-400/10 text-sky-300 border border-sky-400/30',
    Rejected: 'bg-white/5 text-slate-400 border border-white/15',
    High: 'bg-red-400/10 text-red-300 border border-red-400/30',
    Medium: 'bg-amber-400/10 text-amber-300 border border-amber-400/30',
    Low: 'bg-sky-400/10 text-sky-300 border border-sky-400/30',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${m[s] || 'bg-white/5 text-slate-300 border border-white/15'}`}>{s}</span>;
}
