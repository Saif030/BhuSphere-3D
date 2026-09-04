import React, { createContext, useContext, useState } from 'react';
type Auth = { username: string; role: string } | null;
const Ctx = createContext<{ auth: Auth; setAuth: (a: Auth) => void; highlights: any[]; setHighlights: (h: any[]) => void;
  toast: string | null; setToast: (t: string | null) => void }>(
  { auth: null, setAuth: () => {}, highlights: [], setHighlights: () => {}, toast: null, setToast: () => {} });
export const Store = ({ children }: { children: React.ReactNode }) => {
  const [auth, setAuthState] = useState<Auth>(() => {
    try { const t = localStorage.getItem('bhu_token'); const u = localStorage.getItem('bhu_user');
      return t && u ? JSON.parse(u) : null; } catch { return null; } });
  const [highlights, setHighlights] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const setAuth = (a: Auth) => {
    setAuthState(a);
    if (a) localStorage.setItem('bhu_user', JSON.stringify(a)); else { localStorage.removeItem('bhu_user'); localStorage.removeItem('bhu_token'); }
  };
  return <Ctx.Provider value={{ auth, setAuth, highlights, setHighlights, toast, setToast }}>{children}</Ctx.Provider>;
};
export const useStore = () => useContext(Ctx);
