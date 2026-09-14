import React from 'react';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: any) { return { err: e?.message || 'Something went wrong' }; }
  componentDidCatch() {}
  render() {
    if (this.state.err)
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="panel-pad max-w-md text-sm">
            <div className="font-bold text-lg text-slate-900 mb-1">Something went wrong</div>
            <div className="text-slate-500 text-xs mb-3 font-mono">{this.state.err}</div>
            <button onClick={() => { this.setState({ err: null }); window.location.href = '/'; }} className="btn-primary">Back to home</button>
          </div>
        </div>
      );
    return this.props.children;
  }
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
