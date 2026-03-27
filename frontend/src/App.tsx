// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
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
import DashboardHomePage from './pages/studentDashboard/DashboardHomePage';
import OpportunitiesPage from './pages/studentDashboard/OpportunitiesPage';
import CompaniesPage from './pages/studentDashboard/CompaniesPage';
import ChatPage from './pages/studentDashboard/ChatPage';
import UserProfilePage from './pages/studentDashboard/UserProfilePage';
import OpportunityDetailPage from './pages/studentDashboard/OpportunityDetailPage';

// Curator imports
import CuratorLayout from './pages/curatorDashboard/CuratorLayout';
import CuratorDashboardHomePage from './pages/curatorDashboard/DashboardHomePage';
import CuratorCompaniesPage from './pages/curatorDashboard/CompaniesPage';
import CuratorOpportunitiesPage from './pages/curatorDashboard/OpportunitiesPage';
import CuratorUsersPage from './pages/curatorDashboard/UsersPage';
import CuratorTagsPage from './pages/curatorDashboard/TagsPage';
import CuratorReviewsPage from './pages/curatorDashboard/ReviewsPage';
import CuratorSettingsPage from './pages/curatorDashboard/SettingsPage';

import './styles/landing.css';
import './styles/studentDashboard.css';
import './styles/curatorDashboard.css';

// Protected Route Component - выносим внутрь AuthProvider
const ProtectedRoute = ({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles: string[];
}) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }
  
  if (!allowedRoles.includes(user.role)) {
    // Перенаправляем на правильный дашборд в зависимости от роли
    if (user.role === 'student') {
      return <Navigate to="/student" replace />;
    }
    if (user.role === 'company') {
      return <Navigate to="/company" replace />;
    }
    if (user.role === 'curator' || user.role === 'admin') {
      return <Navigate to="/curator" replace />;
    }
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// Role-based redirect component
const RoleRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }
  
  if (user.role === 'student') {
    return <Navigate to="/student" replace />;
  }
  if (user.role === 'company') {
    return <Navigate to="/company" replace />;
  }
  if (user.role === 'curator' || user.role === 'admin') {
    return <Navigate to="/curator" replace />;
  }
  
  return <Navigate to="/" replace />;
};

// Компонент для рендеринга маршрутов внутри AuthProvider
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/verify-email" element={<EmailVerification />} />
      <Route path="/verify-email-pending" element={<EmailVerificationPending />} />
      
      {/* Student Routes */}
      <Route 
        path="/student" 
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHomePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="opportunities" element={<OpportunitiesPage />} />
        <Route path="opportunities/:id" element={<OpportunityDetailPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="chat/:userId" element={<ChatPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="user/:userId" element={<UserProfilePage />} />
      </Route>
      
      {/* Curator Routes */}
      <Route 
        path="/curator" 
        element={
          <ProtectedRoute allowedRoles={['curator', 'admin']}>
            <CuratorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CuratorDashboardHomePage />} />
        <Route path="companies" element={<CuratorCompaniesPage />} />
        <Route path="companies/:companyId" element={<CuratorCompaniesPage />} />
        <Route path="opportunities" element={<CuratorOpportunitiesPage />} />
        <Route path="opportunities/:opportunityId" element={<CuratorOpportunitiesPage />} />
        <Route path="users" element={<CuratorUsersPage />} />
        <Route path="users/:userId" element={<CuratorUsersPage />} />
        <Route path="tags" element={<CuratorTagsPage />} />
        <Route path="reviews" element={<CuratorReviewsPage />} />
        <Route path="settings" element={<CuratorSettingsPage />} />
      </Route>
      
      {/* Role-based redirect for dashboard */}
      <Route path="/dashboard" element={<RoleRedirect />} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;