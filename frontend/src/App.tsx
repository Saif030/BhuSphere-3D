import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Store, useStore } from './lib/store';
import { ErrorBoundary } from './components/feedback';
import Layout from './components/Layout';
import Copilot from './components/Copilot';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/Map';
import Viewer3D from './pages/Viewer3D';
import Property from './pages/Property';
import { ValidationPage, InfraPage, AdminPage } from './pages/Ops';

// Cesium is heavy — split into its own chunk so the main bundle stays lean.
const City3D = lazy(() => import('./pages/City3D'));

const qc = new QueryClient();
function NotFound() {
  return (
    <div className="p-10 text-center text-sm">
      <div className="font-bold text-lg text-navy">Page not found</div>
      <div className="text-slate-500 mt-1">The view you asked for doesn't exist in this demo.</div>
      <div className="flex gap-2 justify-center mt-4">
        <Link to="/" className="bg-navy text-white rounded-lg px-4 py-1.5">Dashboard</Link>
        <Link to="/map" className="border rounded-lg px-4 py-1.5">Map</Link>
      </div>
    </div>
  );
}
function Shell() {
  const { auth } = useStore();
  const [copilot, setCopilot] = useState(false);
  if (!auth) return (<Routes><Route path="/property/:ulpin" element={<Property />} /><Route path="*" element={<Login />} /></Routes>);
  return (
    <Layout onCopilot={() => setCopilot(true)}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/city" element={<Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading City 3D (Cesium)…</div>}><City3D /></Suspense>} />
        <Route path="/3d" element={<Viewer3D />} />
        <Route path="/validation" element={<ValidationPage />} />
        <Route path="/infrastructure" element={<InfraPage />} />
        <Route path="/reports" element={<AdminPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/property/:ulpin" element={<Property />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Copilot open={copilot} onClose={() => setCopilot(false)} />
    </Layout>
  );
}
export default function App() {
  return <QueryClientProvider client={qc}><Store><BrowserRouter><ErrorBoundary><Shell /></ErrorBoundary></BrowserRouter></Store></QueryClientProvider>;
}
