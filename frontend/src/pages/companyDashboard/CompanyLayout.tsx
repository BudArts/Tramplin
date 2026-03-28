// frontend/src/pages/companyDashboard/CompanyLayout.tsx
import { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Users,
  Star,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Stats {
  totalOpportunities: number;
  activeOpportunities: number;
  totalApplications: number;
  newApplications: number;
  totalViews: number;
  unreadNotifications: number;
  unreadRecommendations: number;
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

const CompanyLayout = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, loading: authLoading, isCompany } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<Stats>({
    totalOpportunities: 0,
    activeOpportunities: 0,
    totalApplications: 0,
    newApplications: 0,
    totalViews: 0,
    unreadNotifications: 0,
    unreadRecommendations: 0,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !isCompany()) {
      if (user.role === 'student') {
        navigate('/student', { replace: true });
      } else if (user.role === 'curator' || user.role === 'admin') {
        navigate('/curator', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, user, isCompany, navigate]);

  useEffect(() => {
    if (isAuthenticated && user && isCompany()) {
      fetchStats();
      fetchNotifications();
      
      const interval = setInterval(() => {
        fetchStats();
        fetchNotifications();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user, isCompany]);

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

  const fetchStats = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const opportunitiesRes = await fetch('/api/opportunities/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (opportunitiesRes.ok) {
        const opportunities = await opportunitiesRes.json();
        const active = opportunities.filter((opp: any) => opp.status === 'active').length;
        
        let totalApps = 0;
        let newApps = 0;
        
        for (const opp of opportunities) {
          try {
            const appsRes = await fetch(`/api/applications/opportunity/${opp.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (appsRes.ok) {
              const apps = await appsRes.json();
              totalApps += apps.length;
              newApps += apps.filter((app: any) => app.status === 'pending').length;
            }
          } catch (error) {
            console.error('Error fetching applications count:', error);
          }
        }
        
        setStats(prev => ({
          ...prev,
          totalOpportunities: opportunities.length,
          activeOpportunities: active,
          totalApplications: totalApps,
          newApplications: newApps,
        }));
      }

      const unreadRes = await fetch('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (unreadRes.ok) {
        const data = await unreadRes.json();
        setStats(prev => ({ ...prev, unreadNotifications: data.count || 0 }));
      }

      // ИСПРАВЛЕНО: /api/company/... -> /api/companies/...
      const recommendationsRes = await fetch('/companies/recommendations/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (recommendationsRes.ok) {
        const data = await recommendationsRes.json();
        setStats(prev => ({ ...prev, unreadRecommendations: data.count || 0 }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchNotifications = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    try {
      const response = await fetch('/api/notifications?per_page=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setStats(prev => ({ ...prev, unreadNotifications: Math.max(0, prev.unreadNotifications - 1) }));
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
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setStats(prev => ({ ...prev, unreadNotifications: 0 }));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
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
      <div className="company-dashboard__loading">
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (!isCompany()) {
    return null;
  }

  const displayName = user.display_name || `${user.first_name} ${user.last_name}`;
  const initials = `${user.first_name?.[0]}${user.last_name?.[0]}`.toUpperCase();

  const applicationsBadge = (stats.newApplications || 0) + (stats.unreadRecommendations || 0);

  const navItems = [
    { to: '/company', icon: LayoutDashboard, label: 'Дашборд', exact: true },
    { to: '/company/profile', icon: Building2, label: 'Профиль компании' },
    { to: '/company/opportunities', icon: Briefcase, label: 'Вакансии', badge: stats.totalOpportunities },
    { to: '/company/applications', icon: Users, label: 'Отклики и рекомендации', badge: applicationsBadge > 0 ? applicationsBadge : undefined },
    { to: '/company/favorites', icon: Star, label: 'Избранное' },
    { to: '/company/settings', icon: Settings, label: 'Настройки' },
  ];

  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  return (
    <div className="company-dashboard">
      <div className="app__bg-glow app__bg-glow--1"></div>
      <div className="app__bg-glow app__bg-glow--2"></div>
      <div className="app__bg-glow app__bg-glow--3"></div>

      <header className="company-dashboard__header">
        <div className="container company-dashboard__header-inner">
          <div className="company-dashboard__logo" onClick={() => navigate('/company')}>
            <img src="/logo.png" alt="Трамплин" className="company-dashboard__logo-img" />
            <span className="company-dashboard__logo-badge">Компания</span>
          </div>
          <div className="company-dashboard__header-actions">
            <div className="company-dashboard__notifications-wrapper" ref={notificationsRef}>
              <button 
                className="company-dashboard__notif-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="company-dashboard__badge">{unreadNotifications}</span>
                )}
              </button>
              
              {showNotifications && (
                <div className="company-dashboard__notifications-dropdown">
                  <div className="company-dashboard__notifications-header">
                    <h4>Уведомления</h4>
                    {unreadNotifications > 0 && (
                      <button 
                        onClick={markAllNotificationsAsRead} 
                        className="company-dashboard__notifications-read-all"
                      >
                        Прочитать все
                      </button>
                    )}
                  </div>
                  <div className="company-dashboard__notifications-list">
                    {notifications.length === 0 ? (
                      <p className="company-dashboard__notifications-empty">Нет уведомлений</p>
                    ) : (
                      notifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`company-dashboard__notification-item ${!notification.is_read ? 'unread' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="company-dashboard__notification-content">
                            <div className="company-dashboard__notification-title">{notification.title}</div>
                            <div className="company-dashboard__notification-message">{notification.message}</div>
                            <div className="company-dashboard__notification-date">
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

            <button className="company-dashboard__logout-btn" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Выйти</span>
            </button>
            <button
              className="company-dashboard__mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      <div className="container company-dashboard__layout">
        <aside className={`company-dashboard__sidebar ${mobileMenuOpen ? 'company-dashboard__sidebar--mobile-open' : ''}`}>
          <div className="company-dashboard__user-card">
            <div className="company-dashboard__avatar">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={displayName} />
              ) : (
                <div className="company-dashboard__avatar-placeholder">{initials}</div>
              )}
            </div>
            <h3 className="company-dashboard__user-name">{displayName}</h3>
            <p className="company-dashboard__user-email">{user.email}</p>
            <div className="company-dashboard__user-role">
              <Building2 size={14} />
              <span>Компания</span>
            </div>
          </div>

          <nav className="company-dashboard__nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `company-dashboard__nav-item ${isActive ? 'active' : ''}`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="company-dashboard__nav-badge">{item.badge}</span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="company-dashboard__stats-preview">
            <div className="company-dashboard__stat-preview-item">
              <span className="company-dashboard__stat-preview-value">{stats.activeOpportunities}</span>
              <span className="company-dashboard__stat-preview-label">Активных</span>
            </div>
            <div className="company-dashboard__stat-preview-item">
              <span className="company-dashboard__stat-preview-value">{stats.totalApplications}</span>
              <span className="company-dashboard__stat-preview-label">Откликов</span>
            </div>
            <div className="company-dashboard__stat-preview-item">
              <span className="company-dashboard__stat-preview-value">{stats.totalOpportunities}</span>
              <span className="company-dashboard__stat-preview-label">Вакансий</span>
            </div>
            {stats.unreadRecommendations > 0 && (
              <div className="company-dashboard__recommendations-banner">
                <Star size={14} />
                <span>Новых рекомендаций: {stats.unreadRecommendations}</span>
                <button onClick={() => navigate('/company/applications')}>
                  Посмотреть
                </button>
              </div>
            )}
          </div>
        </aside>

        <main className="company-dashboard__main">
          <Outlet context={{
            user,
            refreshStats: fetchStats,
            stats
          }} />
        </main>
      </div>
    </div>
  );
};

export default CompanyLayout;