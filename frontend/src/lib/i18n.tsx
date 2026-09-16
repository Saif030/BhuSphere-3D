import React, { createContext, useContext, useEffect, useState } from 'react';
import { dict as dictCommon } from './dictCommon';
import { dict as dictPortal } from './dictPortal';
import { dict as dictWork } from './dictWork';

export type Lang = 'en' | 'hi';
type Dict = Record<string, string>;

const ALL: Record<Lang, Dict> = {
  en: { ...dictCommon.en, ...dictPortal.en, ...dictWork.en },
  hi: { ...dictCommon.hi, ...dictPortal.hi, ...dictWork.hi },
};

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string, p?: Record<string, string | number>) => string }>({
  lang: 'en', setLang: () => {}, t: (k) => k,
});

export function I18n({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem('bhu_lang') as Lang) === 'hi' ? 'hi' : 'en'; } catch { return 'en'; }
  });
  useEffect(() => {
    try { localStorage.setItem('bhu_lang', lang); } catch {}
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
  }, [lang]);
  const t = (k: string, p?: Record<string, string | number>) => {
    let s = ALL[lang][k] ?? ALL.en[k] ?? k;
    if (p) for (const [kk, vv] of Object.entries(p)) s = s.split(`{${kk}}`).join(String(vv));
    return s;
  };
  return <Ctx.Provider value={{ lang, setLang: setLangState, t }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

/** EN | हिंदी switch used in the portal top bar and the workspace header. */
export function LangToggle({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const { lang, setLang } = useLang();
  const base = 'text-[11px] font-bold px-1.5 py-0.5 rounded transition-colors';
  const cls = (active: boolean) =>
    tone === 'dark'
      ? `${base} ${active ? 'bg-white/15 text-white' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`
      : `${base} ${active ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`;
  return (
    <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label="Language / भाषा">
      <button onClick={() => setLang('en')} aria-pressed={lang === 'en'} className={cls(lang === 'en')}>English</button>
      <span aria-hidden="true" className={tone === 'dark' ? 'text-slate-500' : 'text-slate-300'}>|</span>
      <button onClick={() => setLang('hi')} aria-pressed={lang === 'hi'} className={cls(lang === 'hi')}>हिन्दी</button>
    </div>
  );
}
