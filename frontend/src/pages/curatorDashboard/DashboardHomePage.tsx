// frontend/src/pages/curatorDashboard/DashboardHomePage.tsx
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

interface CuratorContext {
  user: any;
  refreshStats: () => void;
  stats: any;
}

const DashboardHomePage = () => {
  const navigate = useNavigate();
  const { user, refreshStats, stats } = useOutletContext<CuratorContext>();
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [pendingCompanies, setPendingCompanies] = useState<PendingCompany[]>([]);
  const [pendingOpportunities, setPendingOpportunities] = useState<PendingOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      const [statsRes, pendingCompaniesRes, pendingOpportunitiesRes] = await Promise.all([
        fetch('/api/curator/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/curator/companies/pending', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/curator/opportunities/pending', { headers: { Authorization: `Bearer ${token}` } }),
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
      <div className="curator-home__loading">
        <div className="spinner"></div>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div className="curator-home">
      <motion.div
        className="curator-home__welcome"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1>Добро пожаловать, {user?.first_name}!</h1>
          <p>Панель управления платформой «Трамплин»</p>
        </div>
        <div className="curator-home__date">
          <Clock size={16} />
          <span>{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="curator-home__stats">
        <motion.div
          className="curator-home__stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="curator-home__stat-icon" style={{ background: 'linear-gradient(135deg, #33ccff, #33ff66)' }}>
            <Users size={24} />
          </div>
          <div className="curator-home__stat-info">
            <h3>{platformStats?.total_users || 0}</h3>
            <p>Всего пользователей</p>
          </div>
        </motion.div>
        <motion.div
          className="curator-home__stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="curator-home__stat-icon" style={{ background: 'linear-gradient(135deg, #ffcc33, #ffaa00)' }}>
            <Building2 size={24} />
          </div>
          <div className="curator-home__stat-info">
            <h3>{platformStats?.total_employers || 0}</h3>
            <p>Компаний</p>
          </div>
        </motion.div>
        <motion.div
          className="curator-home__stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="curator-home__stat-icon" style={{ background: 'linear-gradient(135deg, #ff3366, #cc33ff)' }}>
            <Briefcase size={24} />
          </div>
          <div className="curator-home__stat-info">
            <h3>{platformStats?.total_opportunities || 0}</h3>
            <p>Вакансий</p>
          </div>
        </motion.div>
        <motion.div
          className="curator-home__stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="curator-home__stat-icon" style={{ background: 'linear-gradient(135deg, #ffcc33, #ffaa00)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="curator-home__stat-info">
            <h3>{platformStats?.active_opportunities || 0}</h3>
            <p>Активных</p>
          </div>
        </motion.div>
      </div>

      {/* Pending Items Section */}
      <div className="curator-home__pending-section">
        <div className="curator-home__pending-grid">
          {/* Pending Companies */}
          <motion.div
            className="curator-home__pending-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="curator-home__pending-header">
              <div className="curator-home__pending-title">
                <Building2 size={20} />
                <h3>Ожидают верификации</h3>
              </div>
              <button
                className="curator-home__pending-link"
                onClick={() => navigate('/curator/companies')}
              >
                Все <ChevronRight size={14} />
              </button>
            </div>
            <div className="curator-home__pending-list">
              {pendingCompanies.length === 0 ? (
                <p className="curator-home__pending-empty">Нет компаний на верификации</p>
              ) : (
                pendingCompanies.map(company => (
                  <div key={company.id} className="curator-home__pending-item">
                    <div className="curator-home__pending-item-info">
                      <div className="curator-home__pending-item-name">{company.display_name || company.name}</div>
                      <div className="curator-home__pending-item-meta">
                        <span>ИНН: {company.inn}</span>
                        <span>• {formatDate(company.created_at)}</span>
                      </div>
                    </div>
                    <button
                      className="curator-home__pending-item-btn"
                      onClick={() => navigate(`/curator/companies/${company.id}`)}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            {stats?.pendingCompanies > 5 && (
              <button
                className="curator-home__view-all"
                onClick={() => navigate('/curator/companies')}
              >
                Показать все ({stats.pendingCompanies})
              </button>
            )}
          </motion.div>

          {/* Pending Opportunities */}
          <motion.div
            className="curator-home__pending-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="curator-home__pending-header">
              <div className="curator-home__pending-title">
                <Briefcase size={20} />
                <h3>На модерации</h3>
              </div>
              <button
                className="curator-home__pending-link"
                onClick={() => navigate('/curator/opportunities')}
              >
                Все <ChevronRight size={14} />
              </button>
            </div>
            <div className="curator-home__pending-list">
              {pendingOpportunities.length === 0 ? (
                <p className="curator-home__pending-empty">Нет вакансий на модерации</p>
              ) : (
                pendingOpportunities.map(opp => (
                  <div key={opp.id} className="curator-home__pending-item">
                    <div className="curator-home__pending-item-info">
                      <div className="curator-home__pending-item-name">{opp.title}</div>
                      <div className="curator-home__pending-item-meta">
                        <span>{opp.company?.display_name || opp.company?.name}</span>
                        <span>• {getTypeLabel(opp.type)}</span>
                        <span>• {formatDate(opp.created_at)}</span>
                      </div>
                    </div>
                    <button
                      className="curator-home__pending-item-btn"
                      onClick={() => navigate(`/curator/opportunities/${opp.id}`)}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            {stats?.pendingOpportunities > 5 && (
              <button
                className="curator-home__view-all"
                onClick={() => navigate('/curator/opportunities')}
              >
                Показать все ({stats.pendingOpportunities})
              </button>
            )}
          </motion.div>
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div
        className="curator-home__quick-actions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <h3>Быстрые действия</h3>
        <div className="curator-home__actions-grid">
          <button className="curator-home__action-btn" onClick={() => navigate('/curator/companies')}>
            <Building2 size={20} />
            <span>Верифицировать компании</span>
          </button>
          <button className="curator-home__action-btn" onClick={() => navigate('/curator/opportunities')}>
            <Briefcase size={20} />
            <span>Модерировать вакансии</span>
          </button>
          <button className="curator-home__action-btn" onClick={() => navigate('/curator/tags')}>
            <Tag size={20} />
            <span>Управлять тегами</span>
          </button>
          <button className="curator-home__action-btn" onClick={() => navigate('/curator/users')}>
            <Users size={20} />
            <span>Управлять пользователями</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardHomePage;