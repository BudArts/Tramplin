// frontend/src/pages/studentDashboard/StudentLayout.tsx
import { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import {
  Home,
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
  Building2,
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

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: { link?: string };
  is_read: boolean;
  created_at: string;
}

const StudentLayout = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, loading: authLoading, updateUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationsRef = useRef<HTMLDivElement>(null);
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
      fetchAllStats();
      fetchNotifications();
      
      // Обновляем каждые 30 секунд
      const interval = setInterval(() => {
        fetchAllStats();
        fetchNotifications();
      }, 30000);
      
      // Слушаем события обновления
      const handleAllStatsUpdate = () => {
        console.log('🔄 Updating all stats...');
        fetchAllStats();
        fetchNotifications();
      };
      
      const handleMessagesUpdate = () => {
        console.log('💬 Updating unread messages...');
        fetchUnreadCount();
      };
      
      const handleNotificationsUpdate = () => {
        console.log('🔔 Updating notifications...');
        fetchNotifications();
        fetchNotificationsCount();
      };
      
      window.addEventListener('viewedRecommendationsUpdated', handleAllStatsUpdate);
      window.addEventListener('viewedOpportunitiesUpdated', handleAllStatsUpdate);
      window.addEventListener('unreadMessagesUpdated', handleMessagesUpdate);
      window.addEventListener('notificationsUpdated', handleNotificationsUpdate);
      window.addEventListener('recommendationsUpdated', handleAllStatsUpdate);
      window.addEventListener('contactsUpdated', handleAllStatsUpdate);
      window.addEventListener('applicationsUpdated', handleAllStatsUpdate);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('viewedRecommendationsUpdated', handleAllStatsUpdate);
        window.removeEventListener('viewedOpportunitiesUpdated', handleAllStatsUpdate);
        window.removeEventListener('unreadMessagesUpdated', handleMessagesUpdate);
        window.removeEventListener('notificationsUpdated', handleNotificationsUpdate);
        window.removeEventListener('recommendationsUpdated', handleAllStatsUpdate);
        window.removeEventListener('contactsUpdated', handleAllStatsUpdate);
        window.removeEventListener('applicationsUpdated', handleAllStatsUpdate);
      };
    }
  }, [isAuthenticated, user]);

  // Закрытие меню при клике вне области
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

  const fetchAllStats = async () => {
    await Promise.all([
      fetchStats(),
      fetchUnreadCount(),
      fetchNotificationsCount()
    ]);
  };

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
        
        const viewed = localStorage.getItem('viewed_recommendations');
        const viewedIds = viewed ? new Set(JSON.parse(viewed)) : new Set();
        
        const unreadRecs = recData.filter((r: any) => !viewedIds.has(r.id) && !r.is_read);
        setStats(prev => ({ ...prev, recommendations: unreadRecs.length }));
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
        const count = data.unread_count || 0;
        setStats(prev => ({ ...prev, unreadMessages: count }));
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
        const count = data.unread_count ?? data.count ?? 0;
        console.log('🔔 Notifications count:', count);
        setStats(prev => ({ ...prev, notifications: count }));
      }
    } catch (error) {
      console.error('Error fetching notifications count:', error);
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
        setStats(prev => ({ ...prev, notifications: Math.max(0, prev.notifications - 1) }));
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
        setStats(prev => ({ ...prev, notifications: 0 }));
        window.dispatchEvent(new Event('notificationsUpdated'));
        console.log('✅ All notifications marked as read');
      } else {
        const error = await response.json().catch(() => null);
        console.error('Failed to mark all as read:', error);
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

  const fetchUserProfile = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const response = await fetch('/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const userData = await response.json();
        if (updateUser) {
          updateUser(userData);
        }
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
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
    { to: '/student', icon: Home, label: 'Главная', exact: true },
    { to: '/student/profile', icon: User, label: 'Профиль' },
    { to: '/student/opportunities', icon: Briefcase, label: 'Возможности' },
    { to: '/student/companies', icon: Building2, label: 'Компании' },
    { to: '/student/favorites', icon: Heart, label: 'Избранное', badge: stats.favorites },
    { to: '/student/applications', icon: Briefcase, label: 'Мои отклики', badge: stats.applications },
    { to: '/student/contacts', icon: Users, label: 'Контакты', badge: stats.contacts },
    { to: '/student/chat', icon: MessageCircle, label: 'Сообщения', badge: stats.unreadMessages },
    { to: '/student/settings', icon: Settings, label: 'Настройки' },
  ];

  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  return (
    <div className="student-dashboard">
      <div className="app__bg-glow app__bg-glow--1"></div>
      <div className="app__bg-glow app__bg-glow--2"></div>
      <div className="app__bg-glow app__bg-glow--3"></div>

      <header className="student-dashboard__header">
        <div className="container student-dashboard__header-inner">
          <div className="student-dashboard__logo" onClick={() => navigate('/student')}>
            <img src="/logo.png" alt="Трамплин" className="student-dashboard__logo-img" />
          </div>
          <div className="student-dashboard__header-actions">
            {/* Уведомления с выпадающим меню */}
            <div className="student-dashboard__notifications-wrapper" ref={notificationsRef}>
              <button 
                className="student-dashboard__notif-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="student-dashboard__badge">{unreadNotifications}</span>
                )}
              </button>
              
              {showNotifications && (
                <div className="student-dashboard__notifications-dropdown">
                  <div className="student-dashboard__notifications-header">
                    <h4>Уведомления</h4>
                    {unreadNotifications > 0 && (
                      <button 
                        onClick={markAllNotificationsAsRead} 
                        className="student-dashboard__notifications-read-all"
                      >
                        Прочитать все
                      </button>
                    )}
                  </div>
                  <div className="student-dashboard__notifications-list">
                    {notifications.length === 0 ? (
                      <p className="student-dashboard__notifications-empty">Нет уведомлений</p>
                    ) : (
                      notifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`student-dashboard__notification-item ${!notification.is_read ? 'unread' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="student-dashboard__notification-content">
                            <div className="student-dashboard__notification-title">{notification.title}</div>
                            <div className="student-dashboard__notification-message">{notification.message}</div>
                            <div className="student-dashboard__notification-date">
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

            <button className="student-dashboard__chat-btn" onClick={() => navigate('/student/chat')}>
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
                end={item.exact}
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
              <button onClick={() => navigate('/student/contacts', { state: { tab: 'recommendations' } })}>
                Посмотреть
              </button>
            </div>
          )}
        </aside>

        <main className="student-dashboard__main">
          <Outlet context={{
            user,
            refreshStats: fetchAllStats,
            refreshUser: fetchUserProfile,
            refreshUnread: fetchUnreadCount,
            refreshNotifications: fetchNotifications,
            stats
          }} />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;