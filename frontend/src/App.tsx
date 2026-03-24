// frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import EmailVerificationPending from './pages/EmailVerificationPending';
import EmailVerification from './pages/EmailVerification';
import Dashboard from './pages/Dashboard';
import ScrollProgressBar from './components/ScrollProgressBar';

function App() {
  return (
    <BrowserRouter>
      <ScrollProgressBar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/email-verification-pending" element={<EmailVerificationPending />} />
        <Route path="/verify-email" element={<EmailVerification />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;