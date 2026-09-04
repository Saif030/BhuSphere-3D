import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
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
import { ValidationPage, InfraPage, AdminPage, ReportsPage } from './pages/Ops';

const qc = new QueryClient();
function NotFound() {
  return (
    <div className="p-10 text-center text-sm">
      <div className="font-bold text-lg text-white">Page not found</div>
      <div className="text-slate-500 mt-1">The view you asked for doesn't exist in this demo.</div>
      <div className="flex gap-2 justify-center mt-4">
        <Link to="/" className="btn-primary">Dashboard</Link>
        <Link to="/map" className="btn-ghost">Map</Link>
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
        <Route path="/3d" element={<Viewer3D />} />
        <Route path="/validation" element={<ValidationPage />} />
        <Route path="/infrastructure" element={<InfraPage />} />
        <Route path="/reports" element={<ReportsPage />} />
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
