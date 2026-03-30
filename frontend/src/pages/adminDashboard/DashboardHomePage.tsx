// frontend/src/pages/adminDashboard/DashboardHomePage.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Building2,
  Briefcase,
  Users,
  Tag,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Shield,
  Eye,
  UserCog,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface PlatformStats {
  total_users: number;
  total_applicants: number;
  total_employers: number;
  total_opportunities: number;
  active_opportunities: number;
  total_applications: number;
  pending_verifications: number;
  pending_moderations: number;
  total_tags: number;
  total_curators: number;
  total_reviews: number;
  pending_reviews: number;
}

interface PendingCompany {
  id: number;
  name: string;
  display_name: string;
  inn: string;
  email: string;
  created_at: string;
  status: string;
}

interface PendingOpportunity {
  id: number;
  title: string;
  type: string;
  company: { name: string; display_name: string };
  created_at: string;
  moderation_status: string;
}

interface PendingReview {
  id: number;
  rating: number;
  title?: string;
  text?: string;
  company: { name: string; display_name?: string };
  author: { first_name?: string; last_name?: string } | null;
  created_at: string;
}

interface AdminContext {
  user: any;
  refreshStats: () => void;
  stats: any;
}

const DashboardHomePage = () => {
  const navigate = useNavigate();
  const { user, refreshStats, stats } = useOutletContext<AdminContext>();
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [pendingCompanies, setPendingCompanies] = useState<PendingCompany[]>([]);
  const [pendingOpportunities, setPendingOpportunities] = useState<PendingOpportunity[]>([]);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      const [statsRes, pendingCompaniesRes, pendingOpportunitiesRes, pendingReviewsRes] = await Promise.all([
        fetch('/api/curator/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/curator/companies/pending', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/curator/opportunities/pending', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/reviews?moderation_status=pending&per_page=5', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setPlatformStats(data);
      }
      if (pendingCompaniesRes.ok) {
        const data = await pendingCompaniesRes.json();
        setPendingCompanies(data.slice(0, 5));
      }
      if (pendingOpportunitiesRes.ok) {
        const data = await pendingOpportunitiesRes.json();
        setPendingOpportunities(data.slice(0, 5));
      }
      if (pendingReviewsRes.ok) {
        const data = await pendingReviewsRes.json();
        setPendingReviews(data.items?.slice(0, 5) || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'internship': return 'Стажировка';
      case 'vacancy': return 'Вакансия';
      case 'mentorship': return 'Менторство';
      case 'event': return 'Мероприятие';
      default: return type;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="admin-home__loading">
        <div className="spinner"></div>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div className="admin-home">
      <motion.div
        className="admin-home__welcome"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1>Добро пожаловать, {user?.first_name}!</h1>
          <p>Панель управления платформой «Трамплин»</p>
        </div>
        <div className="admin-home__date">
          <Clock size={16} />
          <span>{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="admin-home__stats">
        <motion.div
          className="admin-home__stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="admin-home__stat-icon" style={{ background: 'linear-gradient(135deg, #33ccff, #33ff66)' }}>
            <Users size={24} />
          </div>
          <div className="admin-home__stat-info">
            <h3>{platformStats?.total_users || 0}</h3>
            <p>Всего пользователей</p>
          </div>
        </motion.div>
        <motion.div
          className="admin-home__stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="admin-home__stat-icon" style={{ background: 'linear-gradient(135deg, #ffcc33, #ffaa00)' }}>
            <Building2 size={24} />
          </div>
          <div className="admin-home__stat-info">
            <h3>{platformStats?.total_employers || 0}</h3>
            <p>Компаний</p>
          </div>
        </motion.div>
        <motion.div
          className="admin-home__stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="admin-home__stat-icon" style={{ background: 'linear-gradient(135deg, #ff3366, #cc33ff)' }}>
            <Briefcase size={24} />
          </div>
          <div className="admin-home__stat-info">
            <h3>{platformStats?.total_opportunities || 0}</h3>
            <p>Вакансий</p>
          </div>
        </motion.div>
        <motion.div
          className="admin-home__stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="admin-home__stat-icon" style={{ background: 'linear-gradient(135deg, #ffcc33, #ffaa00)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="admin-home__stat-info">
            <h3>{platformStats?.active_opportunities || 0}</h3>
            <p>Активных</p>
          </div>
        </motion.div>
        <motion.div
          className="admin-home__stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="admin-home__stat-icon" style={{ background: 'linear-gradient(135deg, #cc33ff, #ff3366)' }}>
            <UserCog size={24} />
          </div>
          <div className="admin-home__stat-info">
            <h3>{stats?.totalCurators || 0}</h3>
            <p>Кураторов</p>
          </div>
        </motion.div>
        <motion.div
          className="admin-home__stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="admin-home__stat-icon" style={{ background: 'linear-gradient(135deg, #33ff66, #33ccff)' }}>
            <MessageSquare size={24} />
          </div>
          <div className="admin-home__stat-info">
            <h3>{platformStats?.total_reviews || 0}</h3>
            <p>Отзывов</p>
          </div>
        </motion.div>
      </div>

      {/* Pending Items Section - 3 columns */}
      <div className="admin-home__pending-section">
        <div className="admin-home__pending-grid admin-home__pending-grid--3cols">
          {/* Pending Companies */}
          <motion.div
            className="admin-home__pending-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="admin-home__pending-header">
              <div className="admin-home__pending-title">
                <Building2 size={20} />
                <h3>Ожидают верификации</h3>
              </div>
              <button
                className="admin-home__pending-link"
                onClick={() => navigate('/admin/companies')}
              >
                Все <ChevronRight size={14} />
              </button>
            </div>
            <div className="admin-home__pending-list">
              {pendingCompanies.length === 0 ? (
                <p className="admin-home__pending-empty">Нет компаний на верификации</p>
              ) : (
                pendingCompanies.map(company => (
                  <div key={company.id} className="admin-home__pending-item">
                    <div className="admin-home__pending-item-info">
                      <div className="admin-home__pending-item-name">{company.display_name || company.name}</div>
                      <div className="admin-home__pending-item-meta">
                        <span>ИНН: {company.inn}</span>
                        <span>• {formatDate(company.created_at)}</span>
                      </div>
                    </div>
                    <button
                      className="admin-home__pending-item-btn"
                      onClick={() => navigate(`/admin/companies/${company.id}`)}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            {stats?.pendingCompanies > 5 && (
              <button
                className="admin-home__view-all"
                onClick={() => navigate('/admin/companies')}
              >
                Показать все ({stats.pendingCompanies})
              </button>
            )}
          </motion.div>

          {/* Pending Opportunities */}
          <motion.div
            className="admin-home__pending-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="admin-home__pending-header">
              <div className="admin-home__pending-title">
                <Briefcase size={20} />
                <h3>На модерации</h3>
              </div>
              <button
                className="admin-home__pending-link"
                onClick={() => navigate('/admin/opportunities')}
              >
                Все <ChevronRight size={14} />
              </button>
            </div>
            <div className="admin-home__pending-list">
              {pendingOpportunities.length === 0 ? (
                <p className="admin-home__pending-empty">Нет вакансий на модерации</p>
              ) : (
                pendingOpportunities.map(opp => (
                  <div key={opp.id} className="admin-home__pending-item">
                    <div className="admin-home__pending-item-info">
                      <div className="admin-home__pending-item-name">{opp.title}</div>
                      <div className="admin-home__pending-item-meta">
                        <span>{opp.company?.display_name || opp.company?.name}</span>
                        <span>• {getTypeLabel(opp.type)}</span>
                        <span>• {formatDate(opp.created_at)}</span>
                      </div>
                    </div>
                    <button
                      className="admin-home__pending-item-btn"
                      onClick={() => navigate(`/admin/opportunities/${opp.id}`)}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            {stats?.pendingOpportunities > 5 && (
              <button
                className="admin-home__view-all"
                onClick={() => navigate('/admin/opportunities')}
              >
                Показать все ({stats.pendingOpportunities})
              </button>
            )}
          </motion.div>

          {/* Pending Reviews */}
          <motion.div
            className="admin-home__pending-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <div className="admin-home__pending-header">
              <div className="admin-home__pending-title">
                <MessageSquare size={20} />
                <h3>На модерации отзывов</h3>
              </div>
              <button
                className="admin-home__pending-link"
                onClick={() => navigate('/admin/reviews')}
              >
                Все <ChevronRight size={14} />
              </button>
            </div>
            <div className="admin-home__pending-list">
              {pendingReviews.length === 0 ? (
                <p className="admin-home__pending-empty">Нет отзывов на модерации</p>
              ) : (
                pendingReviews.map(review => (
                  <div key={review.id} className="admin-home__pending-item">
                    <div className="admin-home__pending-item-info">
                      <div className="admin-home__pending-item-name">
                        {review.title || `Отзыв о ${review.company?.display_name || review.company?.name}`}
                      </div>
                      <div className="admin-home__pending-item-meta">
                        <span>Рейтинг: {review.rating}/5</span>
                        <span>• {review.author?.first_name || 'Аноним'}</span>
                        <span>• {formatDate(review.created_at)}</span>
                      </div>
                    </div>
                    <button
                      className="admin-home__pending-item-btn"
                      onClick={() => navigate(`/admin/reviews`)}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            {stats?.pendingReviews > 5 && (
              <button
                className="admin-home__view-all"
                onClick={() => navigate('/admin/reviews')}
              >
                Показать все ({stats.pendingReviews})
              </button>
            )}
          </motion.div>
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div
        className="admin-home__quick-actions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3>Быстрые действия</h3>
        <div className="admin-home__actions-grid">
          <button className="admin-home__action-btn" onClick={() => navigate('/admin/companies')}>
            <Building2 size={20} />
            <span>Верифицировать компании</span>
          </button>
          <button className="admin-home__action-btn" onClick={() => navigate('/admin/opportunities')}>
            <Briefcase size={20} />
            <span>Модерировать вакансии</span>
          </button>
          <button className="admin-home__action-btn" onClick={() => navigate('/admin/tags')}>
            <Tag size={20} />
            <span>Управлять тегами</span>
          </button>
          <button className="admin-home__action-btn" onClick={() => navigate('/admin/users')}>
            <Users size={20} />
            <span>Управлять пользователями</span>
          </button>
          <button className="admin-home__action-btn" onClick={() => navigate('/admin/curators')}>
            <UserCog size={20} />
            <span>Управлять кураторами</span>
          </button>
          <button className="admin-home__action-btn" onClick={() => navigate('/admin/reviews')}>
            <MessageSquare size={20} />
            <span>Модерировать отзывы</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardHomePage;
