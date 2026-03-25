// frontend/src/pages/studentDashboard/StudentLayout.tsx
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import {
  User,
  Heart,
  Briefcase,
  Users,
  Settings,
  LogOut,
  Bell,
  MessageCircle,
  GraduationCap,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Stats {
  applications: number;
  favorites: number;
  contacts: number;
  recommendations: number;
  unreadMessages: number;
  notifications: number;
}

const StudentLayout = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({
    applications: 0,
    favorites: 0,
    contacts: 0,
    recommendations: 0,
    unreadMessages: 0,
    notifications: 0,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchStats();
      fetchUnreadCount();
      fetchNotificationsCount();
    }
  }, [isAuthenticated, user]);

  const fetchStats = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const [favRes, appRes, contactsRes, recRes] = await Promise.all([
        fetch(`/api/favorites`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/applications/my?per_page=1`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/contacts`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/contacts/recommendations`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (favRes.ok) {
        const favData = await favRes.json();
        setStats(prev => ({ ...prev, favorites: favData.length || 0 }));
      }
      if (appRes.ok) {
        const appData = await appRes.json();
        setStats(prev => ({ ...prev, applications: appData.total || 0 }));
      }
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setStats(prev => ({ ...prev, contacts: contactsData.total || 0 }));
      }
      if (recRes.ok) {
        const recData = await recRes.json();
        const unreadRecs = recData.filter((r: any) => !r.is_read).length;
        setStats(prev => ({ ...prev, recommendations: unreadRecs }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUnreadCount = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/chat/unread`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(prev => ({ ...prev, unreadMessages: data.unread_count || 0 }));
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotificationsCount = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(prev => ({ ...prev, notifications: data.unread_count || 0 }));
      }
    } catch (error) {
      console.error('Error fetching notifications count:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="student-dashboard__loading">
        <div className="spinner"></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const fullName = `${user.first_name} ${user.last_name}`;
  const initials = `${user.first_name?.[0]}${user.last_name?.[0]}`.toUpperCase();

  const navItems = [
    { to: '/student/profile', icon: User, label: 'Профиль' },
    { to: '/student/favorites', icon: Heart, label: 'Избранное', badge: stats.favorites },
    { to: '/student/applications', icon: Briefcase, label: 'Мои отклики', badge: stats.applications },
    { to: '/student/contacts', icon: Users, label: 'Контакты', badge: stats.contacts },
    { to: '/student/settings', icon: Settings, label: 'Настройки' },
  ];

  return (
    <div className="student-dashboard">
      <div className="app__bg-glow app__bg-glow--1"></div>
      <div className="app__bg-glow app__bg-glow--2"></div>
      <div className="app__bg-glow app__bg-glow--3"></div>

      <header className="student-dashboard__header">
        <div className="container student-dashboard__header-inner">
          <div className="student-dashboard__logo" onClick={() => navigate('/student')}>
            <span className="student-dashboard__logo-text">Трамплин</span>
          </div>
          <div className="student-dashboard__header-actions">
            <button className="student-dashboard__notif-btn">
              <Bell size={20} />
              {stats.notifications > 0 && (
                <span className="student-dashboard__badge">{stats.notifications}</span>
              )}
            </button>
            <button className="student-dashboard__chat-btn">
              <MessageCircle size={20} />
              {stats.unreadMessages > 0 && (
                <span className="student-dashboard__badge">{stats.unreadMessages}</span>
              )}
            </button>
            <button className="student-dashboard__logout-btn" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Выйти</span>
            </button>
            <button
              className="student-dashboard__mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      <div className="container student-dashboard__layout">
        <aside className={`student-dashboard__sidebar ${mobileMenuOpen ? 'student-dashboard__sidebar--mobile-open' : ''}`}>
          <div className="student-dashboard__user-card">
            <div className="student-dashboard__avatar">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={fullName} />
              ) : (
                <div className="student-dashboard__avatar-placeholder">{initials}</div>
              )}
            </div>
            <h3 className="student-dashboard__user-name">{fullName}</h3>
            <p className="student-dashboard__user-email">{user.email}</p>
            <div className="student-dashboard__user-role">
              <GraduationCap size={14} />
              <span>
                {user.university
                  ? `${user.university} • ${user.course || '?'} курс`
                  : 'Студент'}
              </span>
            </div>
            {user.is_email_verified && (
              <div className="student-dashboard__verified-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Email подтвержден</span>
              </div>
            )}
          </div>

          <nav className="student-dashboard__nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `student-dashboard__nav-item ${isActive ? 'active' : ''}`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="student-dashboard__nav-badge">{item.badge}</span>
                )}
              </NavLink>
            ))}
          </nav>

          {stats.recommendations > 0 && (
            <div className="student-dashboard__recommendations-banner">
              <MessageCircle size={16} />
              <span>
                У вас {stats.recommendations} новая 
                {stats.recommendations === 1 ? 'я рекомендация' : 
                  stats.recommendations < 5 ? ' рекомендации' : ' рекомендаций'}
              </span>
              <button onClick={() => navigate('/student/contacts')}>
                Посмотреть
              </button>
            </div>
          )}
        </aside>

        <main className="student-dashboard__main">
          <Outlet context={{ 
            user, 
            refreshStats: fetchStats, 
            refreshUnread: fetchUnreadCount,
            stats 
          }} />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;