import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Store, useStore } from './lib/store';
import { ErrorBoundary } from './components/feedback';
import Layout from './components/Layout';
import Copilot from './components/Copilot';
import PublicLayout from './components/gov';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CitizenHome from './pages/CitizenHome';
import MapPage from './pages/Map';
import Viewer3D from './pages/Viewer3D';
import Property from './pages/Property';
import { ValidationPage, ValidationCase, InfraPage, AdminPage, ReportsPage } from './pages/Ops';
import { SubmitLanding, SubmitWizard } from './pages/Submit';
import { MySubmissions, TrackSubmission } from './pages/Track';
import { VerifyQueue, VerifyWorkspace } from './pages/Queue';
import { Home, About, Services, HowItWorks, VerifyPublic, Help, Contact } from './pages/Public';

const STAFF = ['officer', 'surveyor', 'admin'];
const CITIZEN_LIKE = ['citizen', 'public'];

function NeedRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { auth } = useStore();
  if (!auth || !roles.includes(auth.role)) return <NotFound inside />;
  return <>{children}</>;
}

/** Staff-only KPI dashboard: citizens are redirected to their service portal. */
function StaffOnly({ children }: { children: React.ReactNode }) {
  const { auth } = useStore();
  if (!auth) return <Navigate to="/login" replace />;
  if (CITIZEN_LIKE.includes(auth.role)) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

const qc = new QueryClient();

function NotFound({ inside = false }: { inside?: boolean }) {
  const body = (
    <div className="p-10 text-center text-sm max-w-md mx-auto">
      <div className="font-bold text-lg text-slate-900">Page not found</div>
      <div className="text-slate-500 mt-1">The view you asked for doesn't exist in this demo.</div>
      <div className="flex gap-2 justify-center mt-4">
        <Link to="/" className="btn-primary">Home</Link>
        <Link to="/verify" className="btn-ghost">Verify property</Link>
      </div>
    </div>
  );
  if (inside) return body;
  return <PublicLayout>{body}</PublicLayout>;
}

/** Post-login landing: citizens → /home service portal, staff → /dashboard. */
function LoginRedirect() {
  const { auth } = useStore();
  const loc = useLocation();
  if (!auth) return <Login />;
  const params = new URLSearchParams(loc.search);
  const next = params.get('next');
  if (next && next.startsWith('/')) return <Navigate to={next} replace />;
  if (CITIZEN_LIKE.includes(auth.role)) return <Navigate to="/home" replace />;
  return <Navigate to="/dashboard" replace />;
}

function Shell() {
  const { auth } = useStore();
  const [copilot, setCopilot] = useState(false);

  // Public portal — always reachable (GIGW-style landing, no login needed).
  const publicRoutes = (
    <>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/services" element={<Services />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/verify" element={<VerifyPublic />} />
      <Route path="/help" element={<Help />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/property/:ulpin" element={<Property />} />
      <Route path="/login" element={<LoginRedirect />} />
    </>
  );

  if (!auth) {
    return (
      <Routes>
        {publicRoutes}
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  return (
    <Layout onCopilot={() => setCopilot(true)}>
      <Routes>
        {publicRoutes}
        {/* Role homes */}
        <Route path="/home" element={<NeedRole roles={[...CITIZEN_LIKE, ...STAFF]}><CitizenOrStaffHome /></NeedRole>} />
        <Route path="/dashboard" element={<StaffOnly><Dashboard /></StaffOnly>} />
        {/* Workspaces */}
        <Route path="/map" element={<MapPage />} />
        <Route path="/3d" element={<Viewer3D />} />
        <Route path="/validation" element={<NeedRole roles={STAFF}><ValidationPage /></NeedRole>} />
        <Route path="/validation/case/:entity" element={<NeedRole roles={STAFF}><ValidationCase /></NeedRole>} />
        <Route path="/infrastructure" element={<NeedRole roles={STAFF}><InfraPage /></NeedRole>} />
        <Route path="/reports" element={<NeedRole roles={STAFF}><ReportsPage /></NeedRole>} />
        <Route path="/admin" element={<NeedRole roles={['admin']}><AdminPage /></NeedRole>} />
        <Route path="/submit" element={<NeedRole roles={['citizen', 'officer', 'surveyor', 'admin']}><SubmitLanding /></NeedRole>} />
        <Route path="/submit/new" element={<NeedRole roles={['citizen', 'officer', 'surveyor', 'admin']}><SubmitWizard /></NeedRole>} />
        <Route path="/submit/my" element={<NeedRole roles={['citizen', 'officer', 'surveyor', 'admin']}><MySubmissions /></NeedRole>} />
        <Route path="/submit/track/:sid" element={<NeedRole roles={['citizen', 'officer', 'surveyor', 'admin']}><TrackSubmission /></NeedRole>} />
        <Route path="/submit/queue" element={<NeedRole roles={['officer', 'admin']}><VerifyQueue /></NeedRole>} />
        <Route path="/submit/verify/:sid" element={<NeedRole roles={['officer', 'admin']}><VerifyWorkspace /></NeedRole>} />
        <Route path="*" element={<NotFound inside />} />
      </Routes>
      <Copilot open={copilot} onClose={() => setCopilot(false)} />
    </Layout>
  );
}

/** /home renders the citizen service portal for everyone; staff get a shortcut to their dashboard. */
function CitizenOrStaffHome() {
  const { auth } = useStore();
  if (auth && STAFF.includes(auth.role)) {
    return (
      <div>
        <div className="mx-5 mt-4 panel px-4 py-2.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span>You are signed in as <b className="capitalize">{auth.role}</b>. Your operational home is the staff dashboard.</span>
          <Link to="/dashboard" className="btn-primary !py-1 !text-xs ml-auto">Open staff dashboard →</Link>
        </div>
        <CitizenHome />
      </div>
    );
  }
  return <CitizenHome />;
}

export default function App() {
  return <QueryClientProvider client={qc}><Store><BrowserRouter><ErrorBoundary><Shell /></ErrorBoundary></BrowserRouter></Store></QueryClientProvider>;
}
