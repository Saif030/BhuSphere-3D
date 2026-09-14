import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPinned, Building2, Boxes, BadgeCheck, AlertTriangle, Zap, Cable, Gauge, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { StatusBadge } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

const AXIS = '#64748b';
const TIP = { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, color: '#1e293b', fontSize: 12 };

function Kpi({ label, value, sub, to, icon: Icon, accent }: any) {
  return (
    <Link to={to} className="panel p-4 block relative overflow-hidden hover:border-gov-navy/40 transition-colors group">
      <span className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <div className="flex items-center justify-between">
        <div className="th-label">{label}</div>
        <Icon size={16} className="text-slate-400 group-hover:text-gov-saffron transition-colors" />
      </div>
      <div className="text-[26px] leading-8 font-extrabold text-slate-900 mt-1 tracking-tight">{value}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>
    </Link>
  );
}

function Section({ title, sub, actions, children }: any) {
  return (
    <section>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <div><h2 className="text-sm font-bold text-slate-900">{title}</h2>{sub && <div className="page-sub">{sub}</div>}</div>
        {actions && <div className="ml-auto">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['stats'], queryFn: () => api.get('/api/dashboard/stats') });
  const d = data?.display; const dc = data?.demo_counts;
  const { data: issues } = useQuery({ queryKey: ['iss'], queryFn: () => api.get('/api/validation/issues') });
  const { auth } = useStore();
  const canSubmit = auth && ['citizen', 'officer', 'surveyor', 'admin'].includes(auth.role);
  const { data: subs } = useQuery({ queryKey: ['sub-stats'], queryFn: () => api.get('/api/dashboard/submissions'), enabled: !!canSubmit });
  const isSurveyor = auth?.role === 'surveyor';
  const isStaffField = auth && ['officer', 'surveyor', 'admin'].includes(auth.role);
  const { data: fieldWork } = useQuery({ queryKey: ['field-stats'], queryFn: () => api.get('/api/field-verification/assigned'), enabled: !!isStaffField });
  // Honesty toggle: city-scale illustrative register vs the actual live demo dataset.
  const [scale, setScale] = useState(() => localStorage.getItem('bhu_scale') || 'city');
  const pick = (s: any) => { localStorage.setItem('bhu_scale', s); setScale(s); };
  const live = scale === 'live';
  const fmt = (v: any) => (typeof v === 'number' ? v.toLocaleString() : (v ?? '—'));
  const K = (cityV: any, liveV: any, liveSub: string, citySub: string) =>
    live ? { v: fmt(liveV), s: liveSub } : { v: fmt(cityV), s: citySub };
  if (isLoading) return <div className="p-6 text-sm text-slate-500">Loading staff dashboard…</div>;
  if (isError || !d) return <div className="p-6 text-sm text-slate-600">Could not load statistics. <button onClick={() => refetch()} className="text-gov-navy underline">Retry</button></div>;
  const kParcels = K(d.parcels, dc?.parcels, 'live demo parcels', `demo loaded: ${dc?.parcels}`);
  const kBld = K(d.buildings, dc?.buildings, 'live demo buildings', `demo: ${dc?.buildings}`);
  const kUnits = K(d.units, dc?.units, 'live demo units', `demo: ${dc?.units}`);
  const kVer = K(d.verified, dc?.verified, 'live verified units', `demo: ${dc?.verified}`);
  const kRev = K(d.needs_review, dc?.needs_review, 'live units needing review', `demo: ${dc?.needs_review}`);
  const kSpat = K(d.spatial_conflicts, dc?.issues, 'live open issues', `demo open: ${dc?.issues}`);
  const kOwn = K(d.ownership_conflicts, dc?.ownership, 'live ownership findings', 'AI-assisted assessment');
  const kUg = K(d.underground, dc?.utilities, 'live utility assets', `demo: ${dc?.utilities}`);
  const kConf = K(d.avg_confidence + '%', (dc?.avg_confidence ?? '—') + '%', 'live mean confidence', `demo: ${dc?.avg_confidence}%`);
  if (isLoading) return <div className="p-6 text-sm text-slate-500">Loading staff dashboard…</div>;
  if (isError || !d) return <div className="p-6 text-sm text-slate-600">Could not load statistics. <button onClick={() => refetch()} className="text-gov-navy underline">Retry</button></div>;
  const sev = ['High', 'Medium', 'Low'].map(s => ({ name: s, n: (issues || []).filter((i: any) => i.severity === s).length }));
  return (
    <div className="p-5 space-y-6 max-w-[1400px] mx-auto">
      <div className="panel px-4 py-2.5 text-xs text-slate-600 flex flex-wrap items-center gap-2">
        <span className="font-bold text-slate-800">Staff dashboard</span>
        <span>· Operational register for officers / surveyors / admins. Citizens use the service portal instead.</span>
        <Link to="/home" className="ml-auto font-semibold text-gov-navy hover:underline">Service portal →</Link>
      </div>
      <Section title="At a glance" sub={live ? 'Live demo dataset — every number is a real record below' : 'Illustrative city-scale register — switch to Live demo for real records'}
        actions={
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 text-xs" role="group" aria-label="Number scale">
            {(['city', 'live'] as const).map(s => (
              <button key={s} onClick={() => pick(s)}
                className={`px-3 py-1 rounded-md font-semibold capitalize transition-colors ${scale === s ? 'bg-gov-navy text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                {s === 'city' ? 'City scale' : 'Live demo'}</button>))}
          </div>}>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3" data-tour="tour-kpis">
          <Kpi label="Total Parcels" value={kParcels.v} sub={kParcels.s} to="/map" icon={MapPinned} accent="bg-gov-navy" />
          <Kpi label="Total Buildings" value={kBld.v} sub={kBld.s} to="/map" icon={Building2} accent="bg-gov-navy" />
          <Kpi label="Registered Units" value={kUnits.v} sub={kUnits.s} to="/map" icon={Boxes} accent="bg-gov-navy" />
          <Kpi label="Verified" value={kVer.v} sub={kVer.s} to="/validation" icon={BadgeCheck} accent="bg-emerald-500" />
          <Kpi label="Needs Review" value={kRev.v} sub={kRev.s} to="/validation" icon={AlertTriangle} accent="bg-amber-400" />
          <Kpi label="Spatial Conflicts" value={kSpat.v} sub={kSpat.s} to="/validation" icon={Zap} accent="bg-red-400" />
          <Kpi label="Ownership Conflicts" value={kOwn.v} sub={kOwn.s} to="/validation" icon={AlertTriangle} accent="bg-red-400" />
          <Kpi label="Underground Assets" value={kUg.v} sub={kUg.s} to="/infrastructure" icon={Cable} accent="bg-sky-400" />
          <Kpi label="Avg Confidence" value={kConf.v} sub={kConf.s} to="/validation" icon={Gauge} accent="bg-emerald-500" />
          <div className="panel p-4 flex flex-col justify-between !bg-gradient-to-br !from-blue-50 !to-orange-50 !border-orange-200">
            <div><div className="text-sm font-bold text-slate-900">Flagship demo: Green Residency</div>
            <div className="text-[11px] text-slate-500 mt-0.5">DL-SKT-0182 · 3 towers · 12/10/15 floors · B1/B2</div></div>
            <div className="flex gap-2 mt-3 text-xs">
              <Link to="/map" className="btn-ghost">Open map</Link>
              <Link to="/3d?b=DL-SKT-0182-B01" className="btn-primary !py-1">Open 3D</Link>
            </div>
          </div>
        </div>
      </Section>
      <Section title="Spatial quality" sub="Live demo validation signal">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="panel-pad"><div className="font-semibold text-sm text-slate-900 mb-2">Open issues by severity</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sev}><CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: AXIS, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TIP} /><Bar dataKey="n" fill="#E87722" radius={[6, 6, 0, 0]} /></BarChart>
            </ResponsiveContainer></div>
          <div className="panel-pad"><div className="font-semibold text-sm text-slate-900 mb-2">Verification mix (demo)</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart><Pie data={[{ name: 'Verified', value: dc?.verified || 1 }, { name: 'Needs review', value: dc?.needs_review || 1 }]}
                dataKey="value" nameKey="name" outerRadius={70} strokeWidth={0}>
                <Cell fill="#138808" /><Cell fill="#E87722" /></Pie><Tooltip contentStyle={TIP} /></PieChart>
            </ResponsiveContainer></div>
        </div>
      </Section>
      {!!canSubmit && (subs?.total || 0) > 0 && (
      <Section title="Submission intake" sub="Property data flowing into the cadastre">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[['Total', subs.total, '/submit/my'],
            ['Pending verification', subs.by_status?.PENDING_VERIFICATION || 0, auth?.role === 'citizen' ? '/submit/my' : isSurveyor ? '/field-work' : '/submit/queue'],
            ['Citizen', subs.citizen, isSurveyor ? '/field-work' : '/submit/queue'],
            ['Government', subs.government, '/submit/my']].map(([l, v, to]: any) =>
            <Link key={l} to={to} className="panel p-4 block hover:border-gov-navy/40 transition-colors">
              <div className="th-label">{l}</div><div className="text-2xl font-extrabold text-slate-900 mt-1">{v}</div></Link>)}
        </div>
      </Section>)}
      {!!isStaffField && !!fieldWork && (
      <Section title={isSurveyor ? 'My field work' : 'Field work'} sub={isSurveyor ? 'Site visits assigned to you' : 'Field verification workload'}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(() => {
            const open = (fieldWork || []).filter((f: any) => f.status === 'Open').length;
            const done = (fieldWork || []).filter((f: any) => f.status === 'Completed').length;
            return [['Open visits', open, '/field-work'], ['Completed', done, '/field-work'],
              ['My department filings', subs?.government || 0, '/submit/my'],
              ['Start govt filing', '→', '/submit']].map(([l, v, to]: any) =>
              <Link key={l} to={to} className="panel p-4 block hover:border-gov-navy/40 transition-colors">
                <div className="th-label">{l}</div><div className="text-2xl font-extrabold text-slate-900 mt-1">{v}</div></Link>);
          })()}
        </div>
        {!!(fieldWork || []).filter((f: any) => f.status === 'Open').length && (
          <div className="mt-2 space-y-1.5">
            {(fieldWork || []).filter((f: any) => f.status === 'Open').slice(0, 3).map((f: any) => (
              <Link key={f.verification_id} to={`/field-work/${f.verification_id}`} className="panel px-4 py-2.5 flex items-center gap-2 text-xs hover:border-violet-300 transition-colors">
                <span className="font-mono font-bold text-violet-700">{f.verification_id}</span>
                <span className="font-mono text-gov-navy">{f.submission_id}</span>
                <span className="text-slate-500 truncate">{f.reason || 'Site visit required'}</span>
                <span className="ml-auto text-violet-700 font-semibold">Open →</span>
              </Link>))}
          </div>)}
      </Section>)}
      <Section title="Needs attention" sub="Latest validation findings — click through to the Validation Center">        <div className="panel divide-y divide-slate-100">
          {(issues || []).slice(0, 8).map((i: any) => (
            <Link key={i.id} to="/validation" className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-xs">
              <StatusBadge s={i.severity} /><span className="text-slate-700 font-medium">{i.type}</span>
              <span className="text-slate-400 font-mono truncate">{i.entity}</span>
              <ArrowRight size={14} className="ml-auto text-slate-300 shrink-0" />
            </Link>))}
          {!(issues || []).length && <div className="px-4 py-3 text-xs text-slate-500">No open issues.</div>}
        </div>
      </Section>
    </div>
  );
}
