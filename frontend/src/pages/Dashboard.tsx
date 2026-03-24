// frontend/src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Briefcase, 
  GraduationCap, 
  Calendar,
  LogOut,
  Settings,
  Heart,
  MessageCircle,
  Bell,
  ChevronRight,
  TrendingUp,
  Star,
  Clock
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface UserData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_email_verified: boolean;
  avatar_url?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    applications: 3,
    favorites: 5,
    messages: 2,
    notifications: 4,
    views: 127,
  });

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          navigate('/');
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (!user) return null;

  const fullName = `${user.first_name} ${user.last_name}`;
  const initials = `${user.first_name?.[0]}${user.last_name?.[0]}`.toUpperCase();

  return (
    <div className="dashboard">
      {/* Фоновые свечения */}
      <div className="app__bg-glow app__bg-glow--1"></div>
      <div className="app__bg-glow app__bg-glow--2"></div>
      <div className="app__bg-glow app__bg-glow--3"></div>

      {/* Header */}
      <header className="dashboard__header">
        <div className="container dashboard__header-inner">
          <div className="dashboard__logo">
            <span className="dashboard__logo-text">Трамплин</span>
          </div>
          <div className="dashboard__header-actions">
            <button className="dashboard__notif-btn">
              <Bell size={20} />
              {stats.notifications > 0 && (
                <span className="dashboard__badge">{stats.notifications}</span>
              )}
            </button>
            <button className="dashboard__logout-btn" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container dashboard__layout">
        {/* Sidebar */}
        <aside className="dashboard__sidebar">
          <div className="dashboard__user-card">
            <div className="dashboard__avatar">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={fullName} />
              ) : (
                <div className="dashboard__avatar-placeholder">
                  {initials}
                </div>
              )}
            </div>
            <h3 className="dashboard__user-name">{fullName}</h3>
            <p className="dashboard__user-email">{user.email}</p>
            <div className="dashboard__user-role">
              {user.role === 'student' ? (
                <>
                  <GraduationCap size={14} />
                  <span>Студент</span>
                </>
              ) : user.role === 'company' ? (
                <>
                  <Briefcase size={14} />
                  <span>Работодатель</span>
                </>
              ) : (
                <>
                  <User size={14} />
                  <span>{user.role}</span>
                </>
              )}
            </div>
            {user.is_email_verified && (
              <div className="dashboard__verified-badge">
                <CheckCircle size={14} />
                <span>Email подтвержден</span>
              </div>
            )}
          </div>

          <nav className="dashboard__nav">
            <a href="#" className="dashboard__nav-item active">
              <User size={20} />
              <span>Профиль</span>
            </a>
            <a href="#" className="dashboard__nav-item">
              <Heart size={20} />
              <span>Избранное</span>
              {stats.favorites > 0 && (
                <span className="dashboard__nav-badge">{stats.favorites}</span>
              )}
            </a>
            <a href="#" className="dashboard__nav-item">
              <Briefcase size={20} />
              <span>Мои отклики</span>
              {stats.applications > 0 && (
                <span className="dashboard__nav-badge">{stats.applications}</span>
              )}
            </a>
            <a href="#" className="dashboard__nav-item">
              <MessageCircle size={20} />
              <span>Сообщения</span>
              {stats.messages > 0 && (
                <span className="dashboard__nav-badge">{stats.messages}</span>
              )}
            </a>
            <a href="#" className="dashboard__nav-item">
              <Settings size={20} />
              <span>Настройки</span>
            </a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="dashboard__main">
          {/* Welcome Section */}
          <motion.div 
            className="dashboard__welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="dashboard__welcome-content">
              <h1>Добро пожаловать, {user.first_name}!</h1>
              <p>Рады видеть вас на платформе. Продолжайте строить свою карьеру вместе с нами.</p>
            </div>
            <div className="dashboard__date">
              <Calendar size={16} />
              <span>{new Date().toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}</span>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="dashboard__stats">
            <motion.div 
              className="dashboard__stat-card"
              whileHover={{ y: -4 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div className="dashboard__stat-icon" style={{ background: 'linear-gradient(135deg, #ff3366, #cc33ff)' }}>
                <Briefcase size={24} />
              </div>
              <div className="dashboard__stat-info">
                <h3>{stats.applications}</h3>
                <p>Активных откликов</p>
              </div>
            </motion.div>

            <motion.div 
              className="dashboard__stat-card"
              whileHover={{ y: -4 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="dashboard__stat-icon" style={{ background: 'linear-gradient(135deg, #33ccff, #33ff66)' }}>
                <Heart size={24} />
              </div>
              <div className="dashboard__stat-info">
                <h3>{stats.favorites}</h3>
                <p>В избранном</p>
              </div>
            </motion.div>

            <motion.div 
              className="dashboard__stat-card"
              whileHover={{ y: -4 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="dashboard__stat-icon" style={{ background: 'linear-gradient(135deg, #ffcc33, #ffaa00)' }}>
                <TrendingUp size={24} />
              </div>
              <div className="dashboard__stat-info">
                <h3>{stats.views}</h3>
                <p>Просмотров профиля</p>
              </div>
            </motion.div>

            <motion.div 
              className="dashboard__stat-card"
              whileHover={{ y: -4 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="dashboard__stat-icon" style={{ background: 'linear-gradient(135deg, #ff3366, #ff884d)' }}>
                <MessageCircle size={24} />
              </div>
              <div className="dashboard__stat-info">
                <h3>{stats.messages}</h3>
                <p>Новых сообщений</p>
              </div>
            </motion.div>
          </div>

          {/* Recent Activity */}
          <div className="dashboard__section">
            <div className="dashboard__section-header">
              <h2>Недавняя активность</h2>
              <button className="dashboard__section-link">
                Все активности <ChevronRight size={16} />
              </button>
            </div>
            <div className="dashboard__activity-list">
              <div className="dashboard__activity-item">
                <div className="dashboard__activity-icon">
                  <CheckCircle size={18} />
                </div>
                <div className="dashboard__activity-content">
                  <p className="dashboard__activity-title">Добро пожаловать на платформу!</p>
                  <p className="dashboard__activity-text">Ваш аккаунт успешно активирован</p>
                  <span className="dashboard__activity-time">Только что</span>
                </div>
              </div>
              <div className="dashboard__activity-item">
                <div className="dashboard__activity-icon">
                  <Star size={18} />
                </div>
                <div className="dashboard__activity-content">
                  <p className="dashboard__activity-title">Завершите профиль</p>
                  <p className="dashboard__activity-text">Добавьте информацию о себе, чтобы работодатели могли вас найти</p>
                  <span className="dashboard__activity-time">5 минут назад</span>
                </div>
              </div>
              <div className="dashboard__activity-item">
                <div className="dashboard__activity-icon">
                  <Clock size={18} />
                </div>
                <div className="dashboard__activity-content">
                  <p className="dashboard__activity-title">Просмотр вакансий</p>
                  <p className="dashboard__activity-text">Вы просмотрели 5 вакансий за последний час</p>
                  <span className="dashboard__activity-time">1 час назад</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard__section">
            <div className="dashboard__section-header">
              <h2>Быстрые действия</h2>
            </div>
            <div className="dashboard__actions">
              {user.role === 'student' ? (
                <>
                  <button className="dashboard__action-btn">
                    <Briefcase size={20} />
                    <span>Найти стажировку</span>
                    <ChevronRight size={16} />
                  </button>
                  <button className="dashboard__action-btn">
                    <User size={20} />
                    <span>Заполнить профиль</span>
                    <ChevronRight size={16} />
                  </button>
                  <button className="dashboard__action-btn">
                    <GraduationCap size={20} />
                    <span>Просмотреть рекомендации</span>
                    <ChevronRight size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button className="dashboard__action-btn">
                    <Briefcase size={20} />
                    <span>Опубликовать вакансию</span>
                    <ChevronRight size={16} />
                  </button>
                  <button className="dashboard__action-btn">
                    <Building2 size={20} />
                    <span>Настроить компанию</span>
                    <ChevronRight size={16} />
                  </button>
                  <button className="dashboard__action-btn">
                    <Users size={20} />
                    <span>Найти кандидатов</span>
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// Вспомогательные компоненты
const CheckCircle = ({ size, ...props }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const Users = ({ size, ...props }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const Building2 = ({ size, ...props }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
    <path d="M6 18h12" />
    <path d="M6 14h12" />
    <path d="M10 6h4" />
    <path d="M10 10h4" />
  </svg>
);

export default Dashboard;