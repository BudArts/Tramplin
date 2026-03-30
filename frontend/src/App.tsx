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
import './styles/companyDashboard.css';
// Curator imports
import CuratorLayout from './pages/curatorDashboard/CuratorLayout';
import CuratorDashboardHomePage from './pages/curatorDashboard/DashboardHomePage';
import CuratorCompaniesPage from './pages/curatorDashboard/CompaniesPage';
import CuratorOpportunitiesPage from './pages/curatorDashboard/OpportunitiesPage';
import CuratorUsersPage from './pages/curatorDashboard/UsersPage';
import CuratorTagsPage from './pages/curatorDashboard/TagsPage';
import CuratorReviewsPage from './pages/curatorDashboard/ReviewsPage';
import CuratorSettingsPage from './pages/curatorDashboard/SettingsPage';
import './styles/adminDashboard.css';
import CompanyLayout from './pages/companyDashboard/CompanyLayout';
import CompanyDashboardHomePage from './pages/companyDashboard/DashboardHomePage';
import CompanyProfilePage from './pages/companyDashboard/ProfilePage';
import CompanyOpportunitiesPage from './pages/companyDashboard/OpportunitiesPage';
import CompanyApplicationsPage from './pages/companyDashboard/ApplicationsPage';
import CompanyFavoritesPage from './pages/companyDashboard/FavoritesPage';
import CompanySettingsPage from './pages/companyDashboard/SettingsPage';

import './styles/landing.css';
import './styles/studentDashboard.css';
import './styles/curatorDashboard.css';

import AdminLayout from './pages/adminDashboard/AdminLayout';
import AdminDashboardHomePage from './pages/adminDashboard/DashboardHomePage';
import AdminCompaniesPage from './pages/adminDashboard/CompaniesPage';
import AdminOpportunitiesPage from './pages/adminDashboard/OpportunitiesPage';
import AdminUsersPage from './pages/adminDashboard/UsersPage';
import AdminCuratorsPage from './pages/adminDashboard/CuratorsPage';
import AdminTagsPage from './pages/adminDashboard/TagsPage';
import AdminReviewsPage from './pages/adminDashboard/ReviewsPage';
import AdminSettingsPage from './pages/adminDashboard/SettingsPage';
import CreateCuratorPage from './pages/adminDashboard/CreateCuratorPage';

// Protected Route Component
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
    // Перенаправление в зависимости от роли пользователя
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === 'curator') {
      return <Navigate to="/curator" replace />;
    }
    if (user.role === 'student') {
      return <Navigate to="/student" replace />;
    }
    if (user.role === 'company') {
      return <Navigate to="/company" replace />;
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

  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  if (user.role === 'curator') {
    return <Navigate to="/curator" replace />;
  }
  if (user.role === 'student') {
    return <Navigate to="/student" replace />;
  }
  if (user.role === 'company') {
    return <Navigate to="/company" replace />;
  }

  return <Navigate to="/" replace />;
};

// Компонент для рендеринга маршрутов внутри AuthProvider
const AppRoutes = () => {
  return (
    <Routes>
      {/* Публичные маршруты */}
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
        <Route path="recommend" element={<RecommendationPage />} />
        <Route path="recommend/:userId" element={<RecommendationPage />} />
      </Route>

      {/* Company Routes */}
      <Route
        path="/company"
        element={
          <ProtectedRoute allowedRoles={['company']}>
            <CompanyLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CompanyDashboardHomePage />} />
        <Route path="profile" element={<CompanyProfilePage />} />
        <Route path="opportunities" element={<CompanyOpportunitiesPage />} />
        <Route path="opportunities/:opportunityId" element={<CompanyOpportunitiesPage />} />
        <Route path="applications" element={<CompanyApplicationsPage />} />
        <Route path="favorites" element={<CompanyFavoritesPage />} />
        <Route path="settings" element={<CompanySettingsPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="chat/:userId" element={<ChatPage />} />
        <Route path="student/user/:userId" element={<UserProfilePage />} />
      </Route>

      {/* ⚠️ Admin Routes - ДОЛЖНЫ БЫТЬ ПЕРЕД Curator Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardHomePage />} />
        <Route path="companies" element={<AdminCompaniesPage />} />
        <Route path="companies/:companyId" element={<AdminCompaniesPage />} />
        <Route path="opportunities" element={<AdminOpportunitiesPage />} />
        <Route path="opportunities/:opportunityId" element={<AdminOpportunitiesPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/:userId" element={<AdminUsersPage />} />
        <Route path="curators" element={<AdminCuratorsPage />} />
        <Route path="curators/create" element={<CreateCuratorPage />} />
        <Route path="tags" element={<AdminTagsPage />} />
        <Route path="reviews" element={<AdminReviewsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* Curator Routes - ТОЛЬКО ДЛЯ КУРАТОРОВ (НЕ ДЛЯ АДМИНОВ) */}
      <Route
        path="/curator"
        element={
          <ProtectedRoute allowedRoles={['curator']}>
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

      {/* Fallback route */}
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