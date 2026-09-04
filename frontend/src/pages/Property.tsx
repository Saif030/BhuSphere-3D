import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../lib/api';
import { ConfidenceRing, StatusBadge } from '../components/ui';

/** Public digital identity — safe fields only, no sensitive owner data. */
export default function Property() {
  const { ulpin } = useParams();
  const { data: u, isLoading, isError } = useQuery({ queryKey: ['pub', ulpin], queryFn: () => api.get('/api/properties/' + ulpin), retry: 1 });
  if (isLoading) return <div className="p-6 text-sm text-slate-500">Loading property identity…</div>;
  if (isError || !u) return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-lg mx-auto bg-white rounded-2xl border p-6 text-sm text-center">
        <div className="font-bold text-lg text-navy">Property not found</div>
        <div className="text-slate-500 mt-1 font-mono text-xs">{ulpin}</div>
        <div className="text-slate-500 mt-1">Check the reference or QR code and try again.</div>
        <Link to="/map" className="inline-block mt-4 bg-navy text-white rounded-lg px-4 py-1.5">Open map</Link>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-lg mx-auto bg-white rounded-2xl border p-6 text-sm space-y-3">
        <div className="font-bold text-lg text-navy">Property Digital Identity</div>
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Prototype 3D cadastral reference — NOT an official Government of India ULPIN.</div>
        <div className="font-mono font-bold">{u.prototype_ulpin}</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div>Parcel: {u.parcel}</div><div>Building: {u.building}</div>
          <div>Floor: {u.floor_label}</div><div>Unit: {u.unit}</div>
          <div>Area: {u.area_sqft} sq.ft</div><div>Vertical: {u.z_min}–{u.z_max}m</div>
        </div>
        <div className="flex items-center gap-3"><ConfidenceRing value={u.confidence} size={80} /><StatusBadge s={u.verification_status} /></div>
        <div className="text-center"><QRCodeSVG value={window.location.href} size={130} /></div>
        <div className="text-[11px] text-slate-500">Public mode: geometry, verification status and reference only. Ownership/registry detail requires authorized role.</div>
      </div>
    </div>
  );
}
