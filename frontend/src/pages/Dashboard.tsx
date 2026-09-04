import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function Kpi({ label, value, sub, to }: any) {
  const inner = <><div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
    <div className="text-2xl font-bold text-navy">{value}</div><div className="text-[11px] text-slate-500">{sub}</div></>;
  const cls = "bg-white rounded-xl border p-4 block" + (to ? " hover:border-sky-400 hover:shadow-sm" : "");
  return to ? <Link to={to} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}
export default function Dashboard() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['stats'], queryFn: () => api.get('/api/dashboard/stats') });
  const d = data?.display; const dc = data?.demo_counts;
  const { data: issues } = useQuery({ queryKey: ['iss'], queryFn: () => api.get('/api/validation/issues') });
  if (isLoading) return <div className="p-6 text-sm text-slate-500">Loading dashboard…</div>;
  if (isError || !d) return <div className="p-6 text-sm">Could not load statistics. <button onClick={() => refetch()} className="text-sky-700 underline">Retry</button></div>;
  const sev = ['High', 'Medium', 'Low'].map(s => ({ name: s, n: (issues || []).filter((i: any) => i.severity === s).length }));
  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <Kpi label="Total Parcels" value={d.parcels.toLocaleString()} sub={`demo loaded: ${dc?.parcels}`} to="/map" />
        <Kpi label="Total Buildings" value={d.buildings.toLocaleString()} sub={`demo: ${dc?.buildings}`} to="/map" />
        <Kpi label="Registered Units" value={d.units.toLocaleString()} sub={`demo: ${dc?.units}`} to="/map" />
        <Kpi label="Verified Properties" value={d.verified.toLocaleString()} sub={`demo: ${dc?.verified}`} to="/validation" />
        <Kpi label="Needs Review" value={d.needs_review.toLocaleString()} sub={`demo: ${dc?.needs_review}`} to="/validation" />
        <Kpi label="Spatial Conflicts" value={d.spatial_conflicts} sub={`demo open: ${dc?.issues}`} to="/validation" />
        <Kpi label="Ownership Conflicts" value={d.ownership_conflicts} sub="AI-assisted" to="/validation" />
        <Kpi label="Underground Assets" value={d.underground.toLocaleString()} sub={`demo: ${dc?.utilities}`} to="/infrastructure" />
        <Kpi label="Avg Confidence" value={d.avg_confidence + '%'} sub={`demo: ${dc?.avg_confidence}%`} />
        <div className="bg-navy text-white rounded-xl p-4 flex flex-col justify-between">
          <div className="text-sm font-semibold">Flagship demo: Green Residency</div>
          <div className="text-[11px] text-sky-300">DL-SKT-0182 · 3 towers · 12/10/15 floors · B1/B2</div>
          <div className="flex gap-2 mt-2 text-xs">
            <Link to="/map" className="bg-white text-navy rounded px-2 py-1">Open map</Link>
            <Link to="/3d?b=DL-SKT-0182-B01" className="bg-sky-600 rounded px-2 py-1">Open 3D</Link>
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4"><div className="font-semibold text-sm mb-2">Open issues by severity</div>
          <ResponsiveContainer width="100%" height={200}><BarChart data={sev}><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="n" fill="#0b1e3a" /></BarChart></ResponsiveContainer></div>
        <div className="bg-white rounded-xl border p-4"><div className="font-semibold text-sm mb-2">Verification mix (demo)</div>
          <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={[{ name: 'Verified', value: dc?.verified || 1 }, { name: 'Needs review', value: dc?.needs_review || 1 }]} dataKey="value" nameKey="name" outerRadius={70}>
            <Cell fill="#16a34a" /><Cell fill="#f59e0b" /></Pie><Tooltip /></PieChart></ResponsiveContainer></div>
      </div>
      <div className="bg-white rounded-xl border p-4"><div className="font-semibold text-sm mb-2">Recent validation issues</div>
        <div className="text-xs space-y-1 max-h-52 overflow-auto scrollthin">
          {(issues || []).slice(0, 12).map((i: any) => <Link key={i.id} to="/validation" className="border-b py-1 flex gap-2 hover:bg-slate-50"><b>{i.severity}</b><span>{i.type}</span><span className="text-slate-500">{i.entity}</span></Link>)}
        </div></div>
    </div>
  );
}
