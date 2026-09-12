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
import { ValidationPage, ValidationCase, InfraPage, AdminPage, ReportsPage } from './pages/Ops';
import { SubmitLanding, SubmitWizard } from './pages/Submit';
import { MySubmissions, TrackSubmission } from './pages/Track';
import { VerifyQueue, VerifyWorkspace } from './pages/Queue';

function NeedRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { auth } = useStore();
  if (!auth || !roles.includes(auth.role)) return <NotFound />;
  return <>{children}</>;
}

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
        <Route path="/validation/case/:entity" element={<ValidationCase />} />
        <Route path="/infrastructure" element={<InfraPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/submit" element={<NeedRole roles={['citizen', 'officer', 'surveyor', 'admin']}><SubmitLanding /></NeedRole>} />
        <Route path="/submit/new" element={<NeedRole roles={['citizen', 'officer', 'surveyor', 'admin']}><SubmitWizard /></NeedRole>} />
        <Route path="/submit/my" element={<NeedRole roles={['citizen', 'officer', 'surveyor', 'admin']}><MySubmissions /></NeedRole>} />
        <Route path="/submit/track/:sid" element={<NeedRole roles={['citizen', 'officer', 'surveyor', 'admin']}><TrackSubmission /></NeedRole>} />
        <Route path="/submit/queue" element={<NeedRole roles={['officer', 'admin']}><VerifyQueue /></NeedRole>} />
        <Route path="/submit/verify/:sid" element={<NeedRole roles={['officer', 'admin']}><VerifyWorkspace /></NeedRole>} />
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
