/** Export the Property Digital Identity card as PNG / PDF.
 *  Manual canvas rendering (no DOM screenshot) so Tailwind styles can't break it,
 *  and the QR is drawn from the on-screen SVG for a crisp result. */

export interface IdentityData {
  ulpin: string;
  parcel: string;
  building: string;
  floor: string;
  unit: string;
  area: string;
  vertical: string;
  confidence: number;
  status: string;
  url: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  survey_number?: string | null;
  property_type?: string | null;
  floor_usage?: string | null;
  building_type?: string | null;
  land_use?: string | null;
  ownership?: string | null;
  owner_status?: string | null;
  registration?: string | null;
  authority?: string | null;
  authority_detail?: string | null;
  updated?: string | null;
}

/** Labelled record rows for the export card (mirrors IdentityFacts). */
function recordRows(d: IdentityData): [string, string][] {
  const dash = '—';
  const geo = d.lat != null && d.lng != null
    ? `${Number(d.lat).toFixed(4)}° N, ${Number(d.lng).toFixed(4)}° E`
    : dash;
  const locExtra = d.survey_number ? `Survey ${d.survey_number}` : '';
  const typeCtx = [d.floor_usage ? `${d.floor_usage} floor` : '', d.building_type ? `${d.building_type} block` : '', d.land_use ? `${d.land_use} parcel` : ''].filter(Boolean).join(' · ');
  const own = d.ownership || '';
  const ownVal = own ? (d.owner_status ? `${own} · record ${String(d.owner_status).toLowerCase()}` : own) : 'Not recorded';
  const authVal = d.authority ? (d.authority_detail ? `${d.authority} — ${d.authority_detail}` : d.authority) : dash;
  return [
    ['Address', d.address || dash],
    ['Location', locExtra && geo !== dash ? `${geo} · ${locExtra}` : geo !== dash ? geo : locExtra || dash],
    ['Type', d.property_type ? (typeCtx ? `${d.property_type} · ${typeCtx}` : d.property_type) : dash],
    ['Ownership', ownVal],
    ['Registration', d.registration || dash],
    ['Authority', authVal],
    ['Last updated', d.updated || dash],
  ];
}

/** Wrap each row value beside its bold label; shared by measure + draw passes. */
function layoutRecord(ctx: CanvasRenderingContext2D, d: IdentityData, maxW: number): { label: string; lines: string[] }[] {
  return recordRows(d).map(([label, value]) => {
    ctx.font = 'bold 12px Arial';
    const lw = ctx.measureText(label + ': ').width;
    ctx.font = '12px Arial';
    return { label, lines: wrap(ctx, value || '—', Math.max(maxW - lw, 80)) };
  });
}

const NAVY = '#1A3A6B';
const GREEN = '#138808';
const SAFFRON = '#E87722';

function statusColors(s: string): [string, string, string] {
  if (s === 'Verified' || s === 'Resolved')
    return ['#ECFDF5', '#6EE7B7', '#047857'];
  if (s === 'Needs Review' || s === 'Open' || s === 'Under Review' || s === 'High Confidence' || s === 'Medium')
    return ['#FFFBEB', '#FCD34D', '#B45309'];
  if (s === 'Unverified' || s === 'Rejected' || s === 'High')
    return ['#FEF2F2', '#FCA5A5', '#B91C1C'];
  return ['#F1F5F9', '#CBD5E1', '#475569'];
}

function confidenceColor(v: number): string {
  if (v >= 95) return GREEN;
  if (v >= 80) return NAVY;
  if (v >= 60) return SAFFRON;
  return '#DC2626';
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = t;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function fileStem(ulpin: string) {
  return (ulpin || 'property').replace(/[^A-Za-z0-9]+/g, '-');
}

/** Rasterise the on-screen QR <svg> so the export carries the same code. */
function qrSvgToImage(svg: SVGSVGElement | null): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!svg) return resolve(null);
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', '440');
      clone.setAttribute('height', '440');
      const str = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
      const objUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        resolve(null);
      };
      img.src = objUrl;
    } catch {
      resolve(null);
    }
  });
}

async function renderCard(d: IdentityData, qrSvg: SVGSVGElement | null): Promise<HTMLCanvasElement> {
  const S = 2; // sharpness scale
  const W = 760;
  const PAD = 36;
  const qrImg = await qrSvgToImage(qrSvg);

  // ---- measure pass (dynamic height for wrapped lines) ----
  const meas = document.createElement('canvas').getContext('2d')!;
  meas.font = '13px Arial';
  const discLines = wrap(meas, 'Prototype 3D cadastral reference — NOT an official Government of India ULPIN.', W - PAD * 2 - 28);
  meas.font = '12px Arial';
  const footLines = wrap(meas, 'Public mode: geometry, verification status and reference only. Ownership detail requires an authorized role.', W - PAD * 2);
  meas.font = '11px Arial';
  const brandLines = wrap(meas, `BhuSphere 3D · SIH 2026 Prototype · Demo data only · Exported ${new Date().toLocaleDateString('en-IN')} · ${d.url}`, W - PAD * 2);
  const recordLayout = layoutRecord(meas, d, W - PAD * 2 - 28);
  const recordH = recordLayout.reduce((a, r) => a + r.lines.length * 16 + 6, 0) + 30;

  const H =
    8 + // tricolor
    28 + // top pad
    34 + // title
    14 +
    discLines.length * 19 + 24 +
    30 + // ulpin
    14 +
    3 * 52 + 2 * 10 + // field grid
    16 +
    recordH + // record details box
    16 +
    96 + // confidence row
    22 +
    214 + // QR
    20 + // caption
    12 +
    footLines.length * 17 + 10 +
    brandLines.length * 15 + 26;

  const cv = document.createElement('canvas');
  cv.width = W * S;
  cv.height = Math.ceil(H * S);
  const ctx = cv.getContext('2d')!;
  ctx.scale(S, S);
  const F = (n: number) => `${n}px Arial`;

  // ---- background + tricolor ----
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#E87722';
  ctx.fillRect(0, 0, W / 3, 6);
  ctx.fillStyle = '#E5E7EB';
  ctx.fillRect(W / 3, 0, W / 3, 6);
  ctx.fillStyle = '#138808';
  ctx.fillRect((2 * W) / 3, 0, W / 3, 6);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  rr(ctx, 1, 1, W - 2, H - 2, 18);
  ctx.stroke();

  let y = 8 + 28;

  // ---- title ----
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(PAD + 11, y + 11, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px Arial';
  ctx.textBaseline = 'middle';
  ctx.fillText('✓', PAD + 6, y + 12);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 24px Arial';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Property Digital Identity', PAD + 30, y + 19);
  y += 34 + 14;

  // ---- disclaimer ----
  ctx.fillStyle = '#FFFBEB';
  ctx.strokeStyle = '#FCD34D';
  ctx.lineWidth = 1.5;
  const discH = discLines.length * 19 + 20;
  rr(ctx, PAD, y, W - PAD * 2, discH, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#92400E';
  ctx.font = F(13);
  discLines.forEach((ln, i) => ctx.fillText(ln, PAD + 14, y + 20 + i * 19));
  y += discH + 16;

  // ---- ULPIN ----
  ctx.fillStyle = NAVY;
  ctx.font = 'bold 19px "Courier New", monospace';
  ctx.fillText(d.ulpin, PAD, y + 18);
  y += 30 + 12;

  // ---- field grid ----
  const fields: [string, string][] = [
    ['Parcel', d.parcel],
    ['Building', d.building],
    ['Floor', d.floor],
    ['Unit', d.unit],
    ['Area', d.area],
    ['Vertical', d.vertical],
  ];
  const gap = 10;
  const bw = (W - PAD * 2 - gap) / 2;
  const bh = 52;
  fields.forEach(([k, v], i) => {
    const cx = PAD + (i % 2) * (bw + gap);
    const cy = y + Math.floor(i / 2) * (bh + gap);
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    rr(ctx, cx, cy, bw, bh, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#64748B';
    ctx.font = F(13);
    const label = k + ': ';
    ctx.fillText(label, cx + 12, cy + 27);
    const lw = ctx.measureText(label).width;
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 13px Arial';
    const val = String(v ?? '');
    const maxV = bw - 24 - lw;
    let shown = val;
    while (shown.length > 1 && ctx.measureText(shown).width > maxV) shown = shown.slice(0, -2);
    if (shown !== val) shown = shown.slice(0, -1) + '…';
    ctx.fillText(shown, cx + 12 + lw, cy + 27);
  });
  y += 3 * bh + 2 * gap + 16;

  // ---- record details box ----
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  rr(ctx, PAD, y, W - PAD * 2, recordH, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('Record details', PAD + 14, y + 19);
  let ry = y + 30;
  for (const { label, lines } of recordLayout) {
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#475569';
    ctx.fillText(label + ':', PAD + 14, ry + 12);
    const lw = ctx.measureText(label + ': ').width;
    ctx.font = '12px Arial';
    ctx.fillStyle = '#1E293B';
    lines.forEach((ln, i) => ctx.fillText(ln, PAD + 14 + (i === 0 ? lw : 14), ry + 12 + i * 16));
    ry += lines.length * 16 + 6;
  }
  y += recordH + 16;

  // ---- confidence ring + status pill ----
  const ringX = PAD + 42;
  const ringY = y + 44;
  const ringR = 34;
  const conf = Number(d.confidence) || 0;
  ctx.lineWidth = 9;
  ctx.strokeStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = confidenceColor(conf);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(ringX, ringY, ringR, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(conf, 100)) / 100);
  ctx.stroke();
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 19px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${conf.toFixed(1)}%`, ringX, ringY - 1);
  ctx.fillStyle = '#64748B';
  ctx.font = F(11);
  ctx.fillText('confidence', ringX, ringY + 17);
  ctx.textAlign = 'left';

  const [pbg, pbd, ptx] = statusColors(d.status);
  ctx.font = 'bold 12px Arial';
  const pillW = ctx.measureText(d.status).width + 28;
  const pillX = PAD + 100;
  const pillY = y + 30;
  ctx.fillStyle = pbg;
  ctx.strokeStyle = pbd;
  ctx.lineWidth = 1.5;
  rr(ctx, pillX, pillY, pillW, 26, 13);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ptx;
  ctx.fillText(d.status, pillX + 14, pillY + 17);
  y += 96 + 20;

  // ---- QR ----
  const qs = 190;
  const qx = (W - qs) / 2;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  rr(ctx, qx - 12, y, qs + 24, qs + 24, 14);
  ctx.fill();
  ctx.stroke();
  if (qrImg) {
    ctx.drawImage(qrImg, qx, y + 12, qs, qs);
  } else {
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(qx, y + 12, qs, qs);
    ctx.fillStyle = '#64748B';
    ctx.font = F(12);
    ctx.textAlign = 'center';
    ctx.fillText('QR unavailable', W / 2, y + qs / 2);
    ctx.textAlign = 'left';
  }
  y += qs + 24 + 8;
  ctx.fillStyle = '#64748B';
  ctx.font = F(12);
  ctx.textAlign = 'center';
  ctx.fillText('Scan to verify online', W / 2, y + 12);
  ctx.textAlign = 'left';
  y += 20 + 12;

  // ---- footer note ----
  ctx.fillStyle = '#64748B';
  ctx.font = F(12);
  footLines.forEach((ln, i) => ctx.fillText(ln, PAD, y + 14 + i * 17));
  y += footLines.length * 17 + 10;

  // ---- brand line ----
  ctx.fillStyle = '#94A3B8';
  ctx.font = F(11);
  brandLines.forEach((ln, i) => ctx.fillText(ln, PAD, y + 13 + i * 15));

  return cv;
}

function saveBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

export async function downloadIdentityPng(d: IdentityData, qrSvg: SVGSVGElement | null): Promise<void> {
  const cv = await renderCard(d, qrSvg);
  const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, 'image/png'));
  if (!blob) throw new Error('PNG render failed');
  saveBlob(blob, `${fileStem(d.ulpin)}-identity.png`);
}

export async function downloadIdentityPdf(d: IdentityData, qrSvg: SVGSVGElement | null): Promise<void> {
  const cv = await renderCard(d, qrSvg);
  const img = cv.toDataURL('image/png');
  const { jsPDF } = await import('jspdf');
  const wPt = cv.width;
  const hPt = cv.height;
  // Fit card on one page; use A4 when close to portrait, else a custom page.
  const ratio = hPt / wPt;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 10;
  let iw = pageW - margin * 2;
  let ih = iw * ratio;
  if (ih > pageH - margin * 2) {
    const ih2 = pageH - margin * 2;
    const iw2 = ih2 / ratio;
    iw = iw2;
    ih = ih2;
  }
  const x = (pageW - iw) / 2;
  const pdfAny = pdf as any;
  pdfAny.setProperties?.({
    title: `Property Digital Identity — ${d.ulpin}`,
    subject: 'BhuSphere 3D prototype identity (demo, not an official ULPIN)',
    creator: 'BhuSphere 3D',
  });
  pdf.addImage(img, 'PNG', x, margin, iw, ih);
  pdf.save(`${fileStem(d.ulpin)}-identity.pdf`);
}
