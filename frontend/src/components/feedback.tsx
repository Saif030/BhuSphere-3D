import React from 'react';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: any) { return { err: e?.message || 'Something went wrong' }; }
  componentDidCatch() {}
  render() {
    if (this.state.err)
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
          <div className="bg-white border rounded-2xl p-8 max-w-md text-sm">
            <div className="font-bold text-lg text-navy mb-1">Something went wrong</div>
            <div className="text-slate-500 text-xs mb-3">{this.state.err}</div>
            <button onClick={() => { this.setState({ err: null }); window.location.href = '/'; }} className="bg-navy text-white rounded-lg px-4 py-1.5">Back to dashboard</button>
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
  return <div className="text-slate-500 text-xs bg-slate-50 border border-dashed rounded-lg p-3">{text}</div>;
}
