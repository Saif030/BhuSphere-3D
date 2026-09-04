import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPinned, Building2, Boxes, BadgeCheck, AlertTriangle, Zap, Cable, Gauge, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

const AXIS = '#64748b';
const TIP = { backgroundColor: '#111f3a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, color: '#e2e8f0', fontSize: 12 };

function Kpi({ label, value, sub, to, icon: Icon, accent }: any) {
  return (
    <Link to={to} className="panel p-4 block relative overflow-hidden hover:border-accent-400/40 transition-colors group">
      <span className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <div className="flex items-center justify-between">
        <div className="th-label">{label}</div>
        <Icon size={16} className="text-slate-500 group-hover:text-accent-400 transition-colors" />
      </div>
      <div className="text-[26px] leading-8 font-extrabold text-white mt-1 tracking-tight">{value}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>
    </Link>
  );
}

function Section({ title, sub, children }: any) {
  return (
    <section>
      <div className="mb-2.5"><h2 className="text-sm font-bold text-white">{title}</h2>{sub && <div className="page-sub">{sub}</div>}</div>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['stats'], queryFn: () => api.get('/api/dashboard/stats') });
  const d = data?.display; const dc = data?.demo_counts;
  const { data: issues } = useQuery({ queryKey: ['iss'], queryFn: () => api.get('/api/validation/issues') });
  if (isLoading) return <div className="p-6 text-sm text-slate-400">Loading command center…</div>;
  if (isError || !d) return <div className="p-6 text-sm text-slate-300">Could not load statistics. <button onClick={() => refetch()} className="text-accent-400 underline">Retry</button></div>;
  const sev = ['High', 'Medium', 'Low'].map(s => ({ name: s, n: (issues || []).filter((i: any) => i.severity === s).length }));
  return (
    <div className="p-5 space-y-6 max-w-[1400px] mx-auto">
      <Section title="At a glance" sub="City-scale register alongside the live demo dataset">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <Kpi label="Total Parcels" value={d.parcels.toLocaleString()} sub={`demo loaded: ${dc?.parcels}`} to="/map" icon={MapPinned} accent="bg-accent-400" />
          <Kpi label="Total Buildings" value={d.buildings.toLocaleString()} sub={`demo: ${dc?.buildings}`} to="/map" icon={Building2} accent="bg-accent-400" />
          <Kpi label="Registered Units" value={d.units.toLocaleString()} sub={`demo: ${dc?.units}`} to="/map" icon={Boxes} accent="bg-accent-400" />
          <Kpi label="Verified" value={d.verified.toLocaleString()} sub={`demo: ${dc?.verified}`} to="/validation" icon={BadgeCheck} accent="bg-emerald-400" />
          <Kpi label="Needs Review" value={d.needs_review.toLocaleString()} sub={`demo: ${dc?.needs_review}`} to="/validation" icon={AlertTriangle} accent="bg-amber-400" />
          <Kpi label="Spatial Conflicts" value={d.spatial_conflicts} sub={`demo open: ${dc?.issues}`} to="/validation" icon={Zap} accent="bg-red-400" />
          <Kpi label="Ownership Conflicts" value={d.ownership_conflicts} sub="AI-assisted assessment" to="/validation" icon={AlertTriangle} accent="bg-red-400" />
          <Kpi label="Underground Assets" value={d.underground.toLocaleString()} sub={`demo: ${dc?.utilities}`} to="/infrastructure" icon={Cable} accent="bg-sky-400" />
          <Kpi label="Avg Confidence" value={d.avg_confidence + '%'} sub={`demo: ${dc?.avg_confidence}%`} to="/validation" icon={Gauge} accent="bg-emerald-400" />
          <div className="panel p-4 flex flex-col justify-between bg-gradient-to-br from-night-800 to-night-700 border-accent-400/20">
            <div><div className="text-sm font-bold text-white">Flagship demo: Green Residency</div>
            <div className="text-[11px] text-accent-300 mt-0.5">DL-SKT-0182 · 3 towers · 12/10/15 floors · B1/B2</div></div>
            <div className="flex gap-2 mt-3 text-xs">
              <Link to="/map" className="btn-ghost">Open map</Link>
              <Link to="/3d?b=DL-SKT-0182-B01" className="btn-primary !py-1">Open 3D</Link>
            </div>
          </div>
        </div>
      </Section>
      <Section title="Spatial quality" sub="Live demo validation signal">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="panel-pad"><div className="font-semibold text-sm text-white mb-2">Open issues by severity</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sev}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TIP} /><Bar dataKey="n" fill="#22d3ee" radius={[6, 6, 0, 0]} /></BarChart>
            </ResponsiveContainer></div>
          <div className="panel-pad"><div className="font-semibold text-sm text-white mb-2">Verification mix (demo)</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart><Pie data={[{ name: 'Verified', value: dc?.verified || 1 }, { name: 'Needs review', value: dc?.needs_review || 1 }]}
                dataKey="value" nameKey="name" outerRadius={70} strokeWidth={0}>
                <Cell fill="#34d399" /><Cell fill="#fbbf24" /></Pie><Tooltip contentStyle={TIP} /></PieChart>
            </ResponsiveContainer></div>
        </div>
      </Section>
      <Section title="Needs attention" sub="Latest validation findings — click through to the Validation Center">
        <div className="panel divide-y divide-white/5">
          {(issues || []).slice(0, 8).map((i: any) => (
            <Link key={i.id} to="/validation" className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] text-xs">
              <StatusBadge s={i.severity} /><span className="text-slate-200 font-medium">{i.type}</span>
              <span className="text-slate-500 font-mono truncate">{i.entity}</span>
              <ArrowRight size={14} className="ml-auto text-slate-600 shrink-0" />
            </Link>))}
          {!(issues || []).length && <div className="px-4 py-3 text-xs text-slate-500">No open issues.</div>}
        </div>
      </Section>
    </div>
  );
}
