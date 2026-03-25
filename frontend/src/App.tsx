// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import EmailVerification from './pages/EmailVerification';
import EmailVerificationPending from './pages/EmailVerificationPending';
import StudentLayout from './pages/studentDashboard/StudentLayout';
import ProfilePage from './pages/studentDashboard/ProfilePage';
import FavoritesPage from './pages/studentDashboard/FavoritesPage';
import ApplicationsPage from './pages/studentDashboard/ApplicationsPage';
import ContactsPage from './pages/studentDashboard/ContactsPage';
import SettingsPage from './pages/studentDashboard/SettingsPage';
import RecommendationPage from './pages/studentDashboard/RecommendationPage';

import './styles/landing.css';
import './styles/studentDashboard.css';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/verify-email-pending" element={<EmailVerificationPending />} />
          
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<Navigate to="/student/profile" replace />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          
          <Route path="/student/recommend/:userId" element={<RecommendationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;