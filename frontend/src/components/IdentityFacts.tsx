import { MapPin, LocateFixed, Home, Scale, ClipboardCheck, Landmark, CalendarCheck } from 'lucide-react';

function Row({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="flex gap-2.5 px-3.5 py-2.5">
      <Icon size={15} className="text-gov-navy shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="text-[11px] text-slate-500">{label}</div>
        <div className="text-[13px] font-semibold text-slate-900 leading-snug break-words">{value}</div>
        {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

/** Public-safe record facts for the identity card — flags only, no owner names. */
export default function IdentityFacts({ u }: { u: any }) {
  const geo = u.lat != null && u.lng != null ? `${Number(u.lat).toFixed(4)}° N, ${Number(u.lng).toFixed(4)}° E` : null;
  const typeCtx = [u.floor_usage ? `${u.floor_usage} floor` : '', u.building_type ? `${u.building_type} block` : '', u.land_use ? `${u.land_use} parcel` : ''].filter(Boolean).join(' · ');
  return (
    <div>
      <div className="text-xs font-bold text-slate-900 mb-1.5">Record details</div>
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        <Row icon={MapPin} label="Address / location" value={u.address || '—'} sub={u.survey_number ? `Survey ${u.survey_number}` : undefined} />
        <Row icon={LocateFixed} label="Geolocation" value={geo || '—'} sub={u.parcel ? `Parcel ${u.parcel} · Building ${u.building || '—'}` : undefined} />
        <Row icon={Home} label="Property type" value={u.property_type || '—'} sub={typeCtx || undefined} />
        <Row
          icon={Scale}
          label="Ownership / legal flag"
          value={u.ownership_type || 'Not recorded'}
          sub={u.ownership_type && u.owner_record_status ? `Owner record ${u.owner_record_status.toLowerCase()}` : undefined}
        />
        <Row icon={ClipboardCheck} label="Registration / mutation status" value={u.registration_status || '—'} />
        <Row icon={Landmark} label="Data source / issuing authority" value={u.issuing_authority || '—'} sub={u.authority_detail || undefined} />
        <Row icon={CalendarCheck} label="Last updated / verified" value={u.last_updated || '—'} />
      </div>
    </div>
  );
}
