import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { ConfidenceRing, StatusBadge } from '../components/ui';

/** Public digital identity — safe fields only, no sensitive owner data. */
export default function Property() {
  const { ulpin } = useParams();
  const { data: u, isLoading, isError } = useQuery({ queryKey: ['pub', ulpin], queryFn: () => api.get('/api/properties/' + ulpin), retry: 1 });
  if (isLoading) return <div className="min-h-screen bg-night-950 p-6 text-sm text-slate-400">Loading property identity…</div>;
  if (isError || !u) return (
    <div className="min-h-screen bg-night-950 p-6">
      <div className="max-w-lg mx-auto panel-pad text-sm text-center">
        <div className="font-bold text-lg text-white">Property not found</div>
        <div className="text-slate-500 mt-1 font-mono text-xs">{ulpin}</div>
        <div className="text-slate-500 mt-1">Check the reference or QR code and try again.</div>
        <Link to="/map" className="btn-primary inline-block mt-4">Open map</Link>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-night-950 p-6">
      <div className="max-w-lg mx-auto panel-pad text-sm space-y-3.5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-accent-400" />
          <div className="font-bold text-lg text-white">Property Digital Identity</div>
        </div>
        <div className="text-[11px] text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded-lg p-2.5">Prototype 3D cadastral reference — NOT an official Government of India ULPIN.</div>
        <div className="font-mono font-bold text-accent-300">{u.prototype_ulpin}</div>
        <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-400">
          {[['Parcel', u.parcel], ['Building', u.building], ['Floor', u.floor_label], ['Unit', u.unit],
            ['Area', u.area_sqft + ' sq.ft'], ['Vertical', `${u.z_min}–${u.z_max}m`]].map(([k, v]) =>
            <div key={k} className="bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5">{k}: <span className="text-slate-100">{v}</span></div>)}
        </div>
        <div className="flex items-center gap-3"><ConfidenceRing value={u.confidence} size={80} /><StatusBadge s={u.verification_status} /></div>
        <div className="text-center"><span className="inline-block bg-white p-3 rounded-xl"><QRCodeSVG value={window.location.href} size={130} /></span></div>
        <div className="text-[11px] text-slate-500">Public mode: geometry, verification status and reference only. Ownership detail requires an authorized role.</div>
      </div>
    </div>
  );
}
