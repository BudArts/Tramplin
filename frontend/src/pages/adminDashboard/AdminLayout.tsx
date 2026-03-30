// frontend/src/pages/adminDashboard/AdminLayout.tsx
import { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, NavLink, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Users,
  Tag,
  MessageSquare,
  Settings,
  LogOut,
  Bell,
  Shield,
  Menu,
  X,
  TrendingUp,
  UserCog,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/adminDashboard.css';

interface Stats {
  pendingCompanies: number;
  pendingOpportunities: number;
  pendingTags: number;
  pendingUsers: number;
  totalUsers: number;
  totalCompanies: number;
  totalOpportunities: number;
  unreadNotifications: number;
  totalCurators: number;
  pendingReviews: number;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: { link?: string };
  is_read: boolean;
  created_at: string;
}

const AdminLayout = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, loading: authLoading, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<Stats>({
    pendingCompanies: 0,
    pendingOpportunities: 0,
    pendingTags: 0,
    pendingUsers: 0,
    totalUsers: 0,
    totalCompanies: 0,
    totalOpportunities: 0,
    unreadNotifications: 0,
    totalCurators: 0,
    pendingReviews: 0,
  });

  // Проверка аутентификации и роли
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Проверка роли - если пользователь не админ, перенаправляем
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !isAdmin()) {
      console.log('User is not admin, redirecting to:', user.role);
      if (user.role === 'student') {
        navigate('/student', { replace: true });
      } else if (user.role === 'company') {
        navigate('/company', { replace: true });
      } else if (user.role === 'curator') {
        navigate('/curator', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, user, isAdmin, navigate]);

  useEffect(() => {
    if (isAuthenticated && user && isAdmin()) {
      fetchAllStats();
      fetchNotifications();
      
      const interval = setInterval(() => {
        fetchAllStats();
        fetchNotifications();
      }, 30000);
      
      const handleStatsUpdate = () => {
        fetchAllStats();
      };
      
      const handleNotificationsUpdate = () => {
        fetchNotifications();
      };
      
      window.addEventListener('adminStatsUpdated', handleStatsUpdate);
      window.addEventListener('notificationsUpdated', handleNotificationsUpdate);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('adminStatsUpdated', handleStatsUpdate);
        window.removeEventListener('notificationsUpdated', handleNotificationsUpdate);
      };
    }
  }, [isAuthenticated, user, isAdmin]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const fetchAllStats = async () => {
    await Promise.all([
      fetchStats(),
      fetchUnreadNotificationsCount(),
      fetchCuratorsCount(),
    ]);
  };

  const fetchStats = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const [pendingCompaniesRes, pendingOpportunitiesRes, pendingTagsRes, platformStatsRes, pendingReviewsRes] = await Promise.all([
        fetch(`/api/curator/companies/pending`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/curator/opportunities/pending`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/curator/tags/pending`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/curator/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/reviews?moderation_status=pending&per_page=1`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (pendingCompaniesRes.ok) {
        const data = await pendingCompaniesRes.json();
        setStats(prev => ({ ...prev, pendingCompanies: data.length || 0 }));
      }
      if (pendingOpportunitiesRes.ok) {
        const data = await pendingOpportunitiesRes.json();
        setStats(prev => ({ ...prev, pendingOpportunities: data.length || 0 }));
      }
      if (pendingTagsRes.ok) {
        const data = await pendingTagsRes.json();
        setStats(prev => ({ ...prev, pendingTags: data.length || 0 }));
      }
      if (platformStatsRes.ok) {
        const data = await platformStatsRes.json();
        setStats(prev => ({
          ...prev,
          totalUsers: data.total_users || 0,
          totalCompanies: data.total_employers || 0,
          totalOpportunities: data.total_opportunities || 0,
        }));
      }
      if (pendingReviewsRes.ok) {
        const data = await pendingReviewsRes.json();
        setStats(prev => ({ ...prev, pendingReviews: data.total || 0 }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCuratorsCount = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/curator/users?role=curator&per_page=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({ ...prev, totalCurators: data.length || 0 }));
      }
    } catch (error) {
      console.error('Error fetching curators count:', error);
    }
  };

  const fetchNotifications = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const response = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUnreadNotificationsCount = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const response = await fetch('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({ ...prev, unreadNotifications: data.count || 0 }));
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setStats(prev => ({ ...prev, unreadNotifications: Math.max(0, prev.unreadNotifications - 1) }));
        window.dispatchEvent(new Event('notificationsUpdated'));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        );
        setStats(prev => ({ ...prev, unreadNotifications: 0 }));
        window.dispatchEvent(new Event('notificationsUpdated'));
      } else {
        const error = await response.json().catch(() => null);
        alert(error?.detail || 'Не удалось отметить все уведомления как прочитанные');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      alert('Ошибка сети. Попробуйте позже.');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markNotificationAsRead(notification.id);
    }
    if (notification.data?.link) {
      navigate(notification.data.link);
    }
    setShowNotifications(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="admin-dashboard__loading">
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Если пользователь не админ, показываем null (редирект произойдет в useEffect)
  if (!isAdmin()) {
    return null;
  }

  const fullName = `${user.first_name} ${user.last_name}`;
  const initials = `${user.first_name?.[0]}${user.last_name?.[0]}`.toUpperCase();

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Дашборд', exact: true },
    { to: '/admin/companies', icon: Building2, label: 'Компании', badge: stats.pendingCompanies },
    { to: '/admin/opportunities', icon: Briefcase, label: 'Вакансии', badge: stats.pendingOpportunities },
    { to: '/admin/users', icon: Users, label: 'Пользователи' },
    { to: '/admin/curators', icon: UserCog, label: 'Кураторы', badge: stats.totalCurators > 0 ? stats.totalCurators : undefined },
    { to: '/admin/tags', icon: Tag, label: 'Теги', badge: stats.pendingTags },
    { to: '/admin/reviews', icon: MessageSquare, label: 'Отзывы', badge: stats.pendingReviews },
    { to: '/admin/settings', icon: Settings, label: 'Настройки' },
  ];

  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  return (
    <div className="admin-dashboard">
      <div className="app__bg-glow app__bg-glow--1"></div>
      <div className="app__bg-glow app__bg-glow--2"></div>
      <div className="app__bg-glow app__bg-glow--3"></div>

      <header className="admin-dashboard__header">
        <div className="container admin-dashboard__header-inner">
          <div className="admin-dashboard__logo" onClick={() => navigate('/admin')}>
            <img src="/logo.png" alt="Трамплин" className="admin-dashboard__logo-img" />
            <span className="admin-dashboard__logo-badge">Администратор</span>
          </div>
          <div className="admin-dashboard__header-actions">
            <div className="admin-dashboard__notifications-wrapper" ref={notificationsRef}>
              <button 
                className="admin-dashboard__notif-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="admin-dashboard__badge">{unreadNotifications}</span>
                )}
              </button>
              
              {showNotifications && (
                <div className="admin-dashboard__notifications-dropdown">
                  <div className="admin-dashboard__notifications-header">
                    <h4>Уведомления</h4>
                    {unreadNotifications > 0 && (
                      <button 
                        onClick={markAllNotificationsAsRead} 
                        className="admin-dashboard__notifications-read-all"
                      >
                        Прочитать все
                      </button>
                    )}
                  </div>
                  <div className="admin-dashboard__notifications-list">
                    {notifications.length === 0 ? (
                      <p className="admin-dashboard__notifications-empty">Нет уведомлений</p>
                    ) : (
                      notifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`admin-dashboard__notification-item ${!notification.is_read ? 'unread' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="admin-dashboard__notification-content">
                            <div className="admin-dashboard__notification-title">{notification.title}</div>
                            <div className="admin-dashboard__notification-message">{notification.message}</div>
                            <div className="admin-dashboard__notification-date">
                              {new Date(notification.created_at).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button className="admin-dashboard__logout-btn" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Выйти</span>
            </button>
            <button
              className="admin-dashboard__mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      <div className="container admin-dashboard__layout">
        <aside className={`admin-dashboard__sidebar ${mobileMenuOpen ? 'admin-dashboard__sidebar--mobile-open' : ''}`}>
          <div className="admin-dashboard__user-card">
            <div className="admin-dashboard__avatar">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={fullName} />
              ) : (
                <div className="admin-dashboard__avatar-placeholder">{initials}</div>
              )}
            </div>
            <h3 className="admin-dashboard__user-name">{fullName}</h3>
            <p className="admin-dashboard__user-email">{user.email}</p>
            <div className="admin-dashboard__user-role">
              <Shield size={14} />
              <span>Администратор</span>
            </div>
          </div>

          <nav className="admin-dashboard__nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `admin-dashboard__nav-item ${isActive ? 'active' : ''}`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="admin-dashboard__nav-badge">{item.badge}</span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="admin-dashboard__create-curator">
            <NavLink to="/admin/curators/create" className="admin-dashboard__create-curator-btn">
              <UserPlus size={18} />
              <span>Создать куратора</span>
            </NavLink>
          </div>

          <div className="admin-dashboard__stats-preview">
            <div className="admin-dashboard__stat-preview-item">
              <span className="admin-dashboard__stat-preview-value">{stats.totalUsers}</span>
              <span className="admin-dashboard__stat-preview-label">Пользователей</span>
            </div>
            <div className="admin-dashboard__stat-preview-item">
              <span className="admin-dashboard__stat-preview-value">{stats.totalCompanies}</span>
              <span className="admin-dashboard__stat-preview-label">Компаний</span>
            </div>
            <div className="admin-dashboard__stat-preview-item">
              <span className="admin-dashboard__stat-preview-value">{stats.totalOpportunities}</span>
              <span className="admin-dashboard__stat-preview-label">Вакансий</span>
            </div>
            <div className="admin-dashboard__stat-preview-item">
              <span className="admin-dashboard__stat-preview-value">{stats.totalCurators}</span>
              <span className="admin-dashboard__stat-preview-label">Кураторов</span>
            </div>
          </div>
        </aside>

        <main className="admin-dashboard__main">
          <Outlet context={{
            user,
            refreshStats: fetchAllStats,
            refreshUser: () => {},
            stats
          }} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;