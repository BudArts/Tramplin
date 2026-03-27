// frontend/src/pages/curatorDashboard/CuratorLayout.tsx
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
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Stats {
  pendingCompanies: number;
  pendingOpportunities: number;
  pendingTags: number;
  pendingUsers: number;
  totalUsers: number;
  totalCompanies: number;
  totalOpportunities: number;
  unreadNotifications: number;
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

const CuratorLayout = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, loading: authLoading, updateUser, isCurator } = useAuth();
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
  });

  // Проверка аутентификации
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Проверка роли - если пользователь не куратор, перенаправляем
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !isCurator()) {
      console.log('User is not curator, redirecting to:', user.role);
      // Перенаправляем на соответствующий дашборд
      if (user.role === 'student') {
        navigate('/student', { replace: true });
      } else if (user.role === 'company') {
        navigate('/company', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, user, isCurator, navigate]);

  useEffect(() => {
    if (isAuthenticated && user && isCurator()) {
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
      
      window.addEventListener('curatorStatsUpdated', handleStatsUpdate);
      window.addEventListener('notificationsUpdated', handleNotificationsUpdate);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('curatorStatsUpdated', handleStatsUpdate);
        window.removeEventListener('notificationsUpdated', handleNotificationsUpdate);
      };
    }
  }, [isAuthenticated, user, isCurator]);

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
      fetchUnreadNotificationsCount()
    ]);
  };

  const fetchStats = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const [pendingCompaniesRes, pendingOpportunitiesRes, pendingTagsRes, platformStatsRes] = await Promise.all([
        fetch(`/api/curator/companies/pending`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/curator/opportunities/pending`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/curator/tags/pending`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/curator/stats`, { headers: { Authorization: `Bearer ${token}` } }),
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
    } catch (error) {
      console.error('Error fetching stats:', error);
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
      <div className="curator-dashboard__loading">
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Если пользователь не куратор, показываем null (редирект произойдет в useEffect)
  if (!isCurator()) {
    return null;
  }

  const fullName = `${user.first_name} ${user.last_name}`;
  const initials = `${user.first_name?.[0]}${user.last_name?.[0]}`.toUpperCase();

  const navItems = [
    { to: '/curator', icon: LayoutDashboard, label: 'Дашборд', exact: true },
    { to: '/curator/companies', icon: Building2, label: 'Компании', badge: stats.pendingCompanies },
    { to: '/curator/opportunities', icon: Briefcase, label: 'Вакансии', badge: stats.pendingOpportunities },
    { to: '/curator/users', icon: Users, label: 'Пользователи' },
    { to: '/curator/tags', icon: Tag, label: 'Теги', badge: stats.pendingTags },
    { to: '/curator/reviews', icon: MessageSquare, label: 'Отзывы' },
    { to: '/curator/settings', icon: Settings, label: 'Настройки' },
    { to: '/curator/reviews', icon: MessageSquare, label: 'Отзывы' },
  ];

  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  return (
    <div className="curator-dashboard">
      <div className="app__bg-glow app__bg-glow--1"></div>
      <div className="app__bg-glow app__bg-glow--2"></div>
      <div className="app__bg-glow app__bg-glow--3"></div>

      <header className="curator-dashboard__header">
        <div className="container curator-dashboard__header-inner">
          <div className="curator-dashboard__logo" onClick={() => navigate('/curator')}>
            <img src="/logo.png" alt="Трамплин" className="curator-dashboard__logo-img" />
            <span className="curator-dashboard__logo-badge">Куратор</span>
          </div>
          <div className="curator-dashboard__header-actions">
            <div className="curator-dashboard__notifications-wrapper" ref={notificationsRef}>
              <button 
                className="curator-dashboard__notif-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="curator-dashboard__badge">{unreadNotifications}</span>
                )}
              </button>
              
              {showNotifications && (
                <div className="curator-dashboard__notifications-dropdown">
                  <div className="curator-dashboard__notifications-header">
                    <h4>Уведомления</h4>
                    {unreadNotifications > 0 && (
                      <button 
                        onClick={markAllNotificationsAsRead} 
                        className="curator-dashboard__notifications-read-all"
                      >
                        Прочитать все
                      </button>
                    )}
                  </div>
                  <div className="curator-dashboard__notifications-list">
                    {notifications.length === 0 ? (
                      <p className="curator-dashboard__notifications-empty">Нет уведомлений</p>
                    ) : (
                      notifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`curator-dashboard__notification-item ${!notification.is_read ? 'unread' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="curator-dashboard__notification-content">
                            <div className="curator-dashboard__notification-title">{notification.title}</div>
                            <div className="curator-dashboard__notification-message">{notification.message}</div>
                            <div className="curator-dashboard__notification-date">
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

            <button className="curator-dashboard__logout-btn" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Выйти</span>
            </button>
            <button
              className="curator-dashboard__mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      <div className="container curator-dashboard__layout">
        <aside className={`curator-dashboard__sidebar ${mobileMenuOpen ? 'curator-dashboard__sidebar--mobile-open' : ''}`}>
          <div className="curator-dashboard__user-card">
            <div className="curator-dashboard__avatar">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={fullName} />
              ) : (
                <div className="curator-dashboard__avatar-placeholder">{initials}</div>
              )}
            </div>
            <h3 className="curator-dashboard__user-name">{fullName}</h3>
            <p className="curator-dashboard__user-email">{user.email}</p>
            <div className="curator-dashboard__user-role">
              <Shield size={14} />
              <span>{user.role === 'admin' ? 'Администратор' : 'Куратор'}</span>
            </div>
          </div>

          <nav className="curator-dashboard__nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `curator-dashboard__nav-item ${isActive ? 'active' : ''}`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="curator-dashboard__nav-badge">{item.badge}</span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="curator-dashboard__stats-preview">
            <div className="curator-dashboard__stat-preview-item">
              <span className="curator-dashboard__stat-preview-value">{stats.totalUsers}</span>
              <span className="curator-dashboard__stat-preview-label">Пользователей</span>
            </div>
            <div className="curator-dashboard__stat-preview-item">
              <span className="curator-dashboard__stat-preview-value">{stats.totalCompanies}</span>
              <span className="curator-dashboard__stat-preview-label">Компаний</span>
            </div>
            <div className="curator-dashboard__stat-preview-item">
              <span className="curator-dashboard__stat-preview-value">{stats.totalOpportunities}</span>
              <span className="curator-dashboard__stat-preview-label">Вакансий</span>
            </div>
          </div>
        </aside>

        <main className="curator-dashboard__main">
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

export default CuratorLayout;