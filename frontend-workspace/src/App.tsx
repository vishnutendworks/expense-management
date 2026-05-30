import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { NewClaim } from './pages/NewClaim';
import { MyClaims } from './pages/MyClaims';
import { Approvals } from './pages/Approvals';
import { Finance } from './pages/Finance';
import { Policies } from './pages/Policies';
import { Reports } from './pages/Reports';
import { Notifications } from './pages/Notifications';
import { ClaimsProvider } from './context/ClaimsContext';

function App() {
  return (
    <ClaimsProvider>
      <Router>
        <DashboardLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/new-claim" element={<NewClaim />} />
            <Route path="/my-claims" element={<MyClaims />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/reimbursements" element={<Finance />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </DashboardLayout>
      </Router>
    </ClaimsProvider>
  );
}

export default App;
