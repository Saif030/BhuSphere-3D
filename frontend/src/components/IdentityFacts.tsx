import { MapPin, LocateFixed, Home, Scale, ClipboardCheck, Landmark, CalendarCheck } from 'lucide-react';
import { useLang } from '../lib/i18n';

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
  const { t } = useLang();
  const geo = u.lat != null && u.lng != null ? `${Number(u.lat).toFixed(4)}° N, ${Number(u.lng).toFixed(4)}° E` : null;
  const typeCtx = [u.floor_usage ? `${u.floor_usage} ${t('facts.floorW')}` : '', u.building_type ? `${u.building_type} ${t('facts.blockW')}` : '', u.land_use ? `${u.land_use} ${t('facts.parcelW')}` : ''].filter(Boolean).join(' · ');
  return (
    <div>
      <div className="text-xs font-bold text-slate-900 mb-1.5">{t('facts.title')}</div>
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        <Row icon={MapPin} label={t('facts.addr')} value={u.address || '—'} sub={u.survey_number ? t('facts.survey', { n: u.survey_number }) : undefined} />
        <Row icon={LocateFixed} label={t('facts.geo')} value={geo || '—'} sub={u.parcel ? t('facts.parcelBld', { x: u.parcel, y: u.building || '—' }) : undefined} />
        <Row icon={Home} label={t('facts.type')} value={u.property_type || '—'} sub={typeCtx || undefined} />
        <Row
          icon={Scale}
          label={t('facts.own')}
          value={u.ownership_type || t('facts.ownNone')}
          sub={u.ownership_type && u.owner_record_status ? (u.owner_record_status === 'Verified' ? t('facts.ownerRecV') : t('facts.ownerRecP')) : undefined}
        />
        <Row icon={ClipboardCheck} label={t('facts.reg')} value={u.registration_status || '—'} />
        <Row icon={Landmark} label={t('facts.auth')} value={u.issuing_authority || '—'} sub={u.authority_detail || undefined} />
        <Row icon={CalendarCheck} label={t('facts.updated')} value={u.last_updated || '—'} />
      </div>
    </div>
  );
}
