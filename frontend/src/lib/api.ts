const BASE = '';
async function req(path: string, opts: any = {}) {
  const token = localStorage.getItem('bhu_token');
  const r = await fetch(BASE + path, { ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(opts.headers || {}) } });
  if (!r.ok) { const t = await r.text(); throw new Error(t || ('HTTP ' + r.status)); }
  return r.json();
}
export const api = {
  get: (p: string) => req(p),
  post: (p: string, b: any = {}) => req(p, { method: 'POST', body: JSON.stringify(b) }),
  login: (u: string, pw: string) => req('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: u, password: pw }) }),
  search: (q: string) => req('/api/search?q=' + encodeURIComponent(q)),
  ai: (question: string) => req('/api/ai/query', { method: 'POST', body: JSON.stringify({ question }) }),
};
