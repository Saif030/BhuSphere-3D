import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { ConfidenceRing, StatusBadge } from '../components/ui';
import PublicLayout from '../components/gov';

/** Public digital identity — safe fields only, no sensitive owner data. */
export default function Property() {
  const { ulpin } = useParams();
  const { data: u, isLoading, isError } = useQuery({ queryKey: ['pub', ulpin], queryFn: () => api.get('/api/properties/' + ulpin), retry: 1 });
  if (isLoading) return <PublicLayout><div className="panel-pad text-sm text-slate-500">Loading property identity…</div></PublicLayout>;
  if (isError || !u) return (
    <PublicLayout>
      <div className="max-w-lg mx-auto panel-pad text-sm text-center">
        <div className="font-bold text-lg text-slate-900">Property not found</div>
        <div className="text-slate-500 mt-1 font-mono text-xs">{ulpin}</div>
        <div className="text-slate-500 mt-1">Check the reference or QR code and try again.</div>
        <div className="flex gap-2 justify-center mt-4">
          <Link to="/verify" className="btn-primary">Verify another</Link>
          <Link to="/" className="btn-ghost">Portal home</Link>
        </div>
      </div>
    </PublicLayout>
  );
  return (
    <PublicLayout trail={[{ label: 'Home', to: '/' }, { label: 'Verify Property', to: '/verify' }, { label: u.prototype_ulpin }]}>
      <div className="max-w-lg mx-auto panel-pad text-sm space-y-3.5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-gov-green" />
          <div className="font-bold text-lg text-slate-900">Property Digital Identity</div>
        </div>
        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">Prototype 3D cadastral reference — NOT an official Government of India ULPIN.</div>
        <div className="font-mono font-bold text-gov-navy">{u.prototype_ulpin}</div>
        <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-500">
          {[['Parcel', u.parcel], ['Building', u.building], ['Floor', u.floor_label], ['Unit', u.unit],
            ['Area', u.area_sqft + ' sq.ft'], ['Vertical', `${u.z_min}–${u.z_max}m`]].map(([k, v]) =>
            <div key={k} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">{k}: <span className="text-slate-800 font-medium">{v}</span></div>)}
        </div>
        <div className="flex items-center gap-3"><ConfidenceRing value={u.confidence} size={80} /><StatusBadge s={u.verification_status} /></div>
        <div className="text-center"><span className="inline-block bg-white p-3 rounded-xl border border-slate-200"><QRCodeSVG value={window.location.href} size={130} /></span></div>
        <div className="text-[11px] text-slate-500">Public mode: geometry, verification status and reference only. Ownership detail requires an authorized role.</div>
      </div>
    </PublicLayout>
  );
}
