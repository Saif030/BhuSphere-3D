import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../lib/i18n';

function ErrorFallback({ err, onReset }: { err: string; onReset: () => void }) {
  const { t } = useLang();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="panel-pad max-w-md text-sm">
        <div className="font-bold text-lg text-slate-900 mb-1">{t('fb.error')}</div>
        <div className="text-slate-500 text-xs mb-3 font-mono">{err}</div>
        <button onClick={onReset} className="btn-primary">{t('fb.home')}</button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: any) { return { err: e?.message || 'Something went wrong' }; }
  componentDidCatch() {}
  render() {
    if (this.state.err)
      return <ErrorFallback err={this.state.err} onReset={() => { this.setState({ err: null }); window.location.href = '/'; }} />;
    return this.props.children;
  }
}

export function NotFound() {
  const { t } = useLang();
  return (
    <div className="p-10 text-center text-sm max-w-md mx-auto">
      <div className="font-bold text-lg text-slate-900">{t('fb.oops')}</div>
      <div className="text-slate-500 mt-1">{t('fb.oopsSub')}</div>
      <div className="flex gap-2 justify-center mt-4">
        <Link to="/" className="btn-primary">{t('fb.homeBtn')}</Link>
        <Link to="/verify" className="btn-ghost">{t('fb.verifyBtn')}</Link>
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

export function Empty({ text }: { text: string }) {
  return <div className="text-slate-500 text-xs bg-slate-50 border border-dashed border-slate-300 rounded-lg p-3">{text}</div>;
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div><h1 className="page-title">{title}</h1>{sub && <div className="page-sub mt-0.5">{sub}</div>}</div>
      {actions && <div className="ml-auto flex flex-wrap gap-2 items-center">{actions}</div>}
    </div>
  );
}
