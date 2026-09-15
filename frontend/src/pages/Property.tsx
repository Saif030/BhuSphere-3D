import { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, ImageDown, FileDown } from 'lucide-react';
import { api } from '../lib/api';
import { ConfidenceRing, StatusBadge } from '../components/ui';
import IdentityFacts from '../components/IdentityFacts';
import { downloadIdentityPdf, downloadIdentityPng, type IdentityData } from '../lib/identityExport';
import PublicLayout from '../components/gov';

/** Public digital identity — safe fields only, no sensitive owner data. */
export default function Property() {
  const { ulpin } = useParams();
  const qrBox = useRef<HTMLSpanElement>(null);
  const [dlBusy, setDlBusy] = useState<'png' | 'pdf' | null>(null);
  const [dlErr, setDlErr] = useState('');
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
  const identity: IdentityData = {
    ulpin: u.prototype_ulpin,
    parcel: u.parcel,
    building: u.building,
    floor: u.floor_label,
    unit: u.unit,
    area: u.area_sqft + ' sq.ft',
    vertical: `${u.z_min}–${u.z_max}m`,
    confidence: Number(u.confidence) || 0,
    status: u.verification_status,
    url: window.location.href,
    address: u.address,
    lat: u.lat, lng: u.lng, survey_number: u.survey_number,
    property_type: u.property_type, floor_usage: u.floor_usage,
    building_type: u.building_type, land_use: u.land_use,
    ownership: u.ownership_type, owner_status: u.owner_record_status,
    registration: u.registration_status,
    authority: u.issuing_authority, authority_detail: u.authority_detail,
    updated: u.last_updated,
  };
  const grabQr = (): SVGSVGElement | null => qrBox.current?.querySelector('svg') ?? null;
  const onDl = async (kind: 'png' | 'pdf') => {
    setDlBusy(kind); setDlErr('');
    try {
      if (kind === 'png') await downloadIdentityPng(identity, grabQr());
      else await downloadIdentityPdf(identity, grabQr());
    } catch { setDlErr('Download failed in this browser. Try the other format.'); }
    setDlBusy(null);
  };
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
        <IdentityFacts u={u} />
        <div className="flex items-center gap-3"><ConfidenceRing value={u.confidence} size={80} /><StatusBadge s={u.verification_status} /></div>
        <div className="text-center"><span ref={qrBox} className="inline-block bg-white p-3 rounded-xl border border-slate-200"><QRCodeSVG value={window.location.href} size={130} /></span></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onDl('png')} disabled={dlBusy !== null} className="btn-primary text-xs inline-flex items-center gap-1.5 disabled:opacity-50">
            <ImageDown size={14} />{dlBusy === 'png' ? 'Preparing…' : 'Download PNG'}
          </button>
          <button onClick={() => onDl('pdf')} disabled={dlBusy !== null} className="btn-ghost text-xs inline-flex items-center gap-1.5 disabled:opacity-50">
            <FileDown size={14} />{dlBusy === 'pdf' ? 'Preparing…' : 'Download PDF'}
          </button>
        </div>
        {dlErr && <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{dlErr}</div>}
        <div className="text-[11px] text-slate-500">Public mode: geometry, verification status and reference only. Ownership detail requires an authorized role.</div>
      </div>
    </PublicLayout>
  );
}
