// frontend/src/pages/studentDashboard/DashboardHomePage.tsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Star, 
  Briefcase, 
  MapPin, 
  Clock, 
  Eye, 
  Building2,
  TrendingUp,
  Users,
  MessageCircle,
  ChevronRight,
  Heart,
  Send
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import OpportunityDetailModal from '../../components/OpportunityDetailModal';
import type { OpportunityResponse, OpportunityType } from '../../api/types';

interface Opportunity {
  id: number;
  title: string;
  description: string;
  type: 'internship' | 'vacancy' | 'mentorship' | 'event';
  work_format: 'office' | 'hybrid' | 'remote';
  salary_min?: number;
  salary_max?: number;
  city: string;
  company_name?: string;
  company_logo?: string;
  tags: Array<{ id: number; name: string }>;
  views_count: number;
  created_at: string;
  published_at?: string;
  latitude?: number;
  longitude?: number;
}

interface Recommendation {
  id: number;
  from_user: {
    id: number;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  opportunity_id: number;
  opportunity_title?: string;
  message?: string;
  is_read: boolean;
  created_at: string;
}

const DashboardHomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendedOpportunities, setRecommendedOpportunities] = useState<Opportunity[]>([]);
  const [recentOpportunities, setRecentOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      // Fetch recommendations
      const recRes = await fetch('/api/contacts/recommendations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (recRes.ok) {
        const recData = await recRes.json();
        setRecommendations(recData);
        
        // Fetch opportunity details for recommendations
        const oppPromises = recData.map((rec: Recommendation) =>
          fetch(`/api/opportunities/${rec.opportunity_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(res => res.ok ? res.json() : null)
        );
        const oppData = await Promise.all(oppPromises);
        setRecommendedOpportunities(oppData.filter(o => o !== null));
      }

      // Fetch recent opportunities (last 6)
      const oppRes = await fetch('/api/opportunities?sort=published_at&order=desc&per_page=6', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (oppRes.ok) {
        const oppData = await oppRes.json();
        setRecentOpportunities(oppData.items || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpportunityClick = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setModalOpen(true);
    // Increment view count
    incrementViewCount(opportunity.id);
  };

  const incrementViewCount = async (opportunityId: number) => {
    const token = localStorage.getItem('access_token');
    try {
      await fetch(`/api/opportunities/${opportunityId}/view`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const handleApply = async (opportunityId: number) => {
    setApplying(true);
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ opportunity_id: opportunityId }),
      });

      if (response.ok) {
        alert('Отклик успешно отправлен!');
        setModalOpen(false);
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при отправке отклика');
      }
    } catch (error) {
      console.error('Error applying:', error);
      alert('Ошибка сети');
    } finally {
      setApplying(false);
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

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'office': return 'Офис';
      case 'hybrid': return 'Гибрид';
      case 'remote': return 'Удаленно';
      default: return format;
    }
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null;
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()} ₽`;
    if (min) return `от ${min.toLocaleString()} ₽`;
    if (max) return `до ${max.toLocaleString()} ₽`;
    return null;
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'сегодня';
    if (days === 1) return 'вчера';
    if (days < 7) return `${days} дн. назад`;
    if (days < 30) return `${Math.floor(days / 7)} нед. назад`;
    return `${Math.floor(days / 30)} мес. назад`;
  };

  if (loading) {
    return (
      <div className="dashboard-home__loading">
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-home">
      {/* Welcome Section */}
      <motion.div
        className="dashboard-home__welcome"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1>Добро пожаловать, {user?.first_name}!</h1>
          <p>Вот что происходит в вашем карьерном путешествии сегодня</p>
        </div>
        <div className="dashboard-home__date">
          <Clock size={16} />
          <span>{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </motion.div>

      {/* Stats Quick Overview */}
      <div className="dashboard-home__stats">
        <div className="dashboard-home__stat-card">
          <div className="dashboard-home__stat-icon" style={{ background: 'linear-gradient(135deg, #ff3366, #cc33ff)' }}>
            <Briefcase size={24} />
          </div>
          <div className="dashboard-home__stat-info">
            <h3>{recentOpportunities.length}</h3>
            <p>Новых возможностей</p>
          </div>
        </div>
        <div className="dashboard-home__stat-card">
          <div className="dashboard-home__stat-icon" style={{ background: 'linear-gradient(135deg, #33ccff, #33ff66)' }}>
            <Star size={24} />
          </div>
          <div className="dashboard-home__stat-info">
            <h3>{recommendations.length}</h3>
            <p>Рекомендаций</p>
          </div>
        </div>
      </div>

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <motion.div
          className="dashboard-home__section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="dashboard-home__section-header">
            <div className="dashboard-home__section-title">
              <Star size={20} />
              <h2>Рекомендовано для вас</h2>
            </div>
            <button className="dashboard-home__section-link" onClick={() => navigate('/student/opportunities')}>
              Все рекомендации <ChevronRight size={16} />
            </button>
          </div>
          <div className="dashboard-home__recommendations-grid">
            {recommendedOpportunities.slice(0, 3).map((opp, index) => {
              const recommendation = recommendations.find(r => r.opportunity_id === opp.id);
              return (
                <motion.div
                  key={opp.id}
                  className="dashboard-home__recommendation-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  onClick={() => handleOpportunityClick(opp)}
                >
                  <div className="dashboard-home__recommendation-badge">
                    <MessageCircle size={12} />
                    <span>Рекомендовал {recommendation?.from_user.first_name}</span>
                  </div>
                  <div className="dashboard-home__card-header">
                    <div className="dashboard-home__card-badges">
                      <span className={`dashboard-home__type-badge dashboard-home__type-badge--${opp.type}`}>
                        {getTypeLabel(opp.type)}
                      </span>
                      <span className="dashboard-home__format-badge">
                        {getFormatLabel(opp.work_format)}
                      </span>
                    </div>
                  </div>
                  <h3 className="dashboard-home__card-title">{opp.title}</h3>
                  <div className="dashboard-home__card-company">
                    {opp.company_logo ? (
                      <img src={opp.company_logo} alt={opp.company_name} />
                    ) : (
                      <div className="dashboard-home__card-company-placeholder">
                        {opp.company_name?.[0] || '?'}
                      </div>
                    )}
                    <span>{opp.company_name}</span>
                  </div>
                  <div className="dashboard-home__card-meta">
                    <div className="dashboard-home__card-meta-item">
                      <MapPin size={14} />
                      <span>{opp.city}</span>
                    </div>
                    {formatSalary(opp.salary_min, opp.salary_max) && (
                      <div className="dashboard-home__card-meta-item dashboard-home__card-salary">
                        {formatSalary(opp.salary_min, opp.salary_max)}
                      </div>
                    )}
                  </div>
                  {recommendation?.message && (
                    <p className="dashboard-home__recommendation-message">
                      "{recommendation.message}"
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Recent Opportunities Section */}
      <motion.div
        className="dashboard-home__section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="dashboard-home__section-header">
          <div className="dashboard-home__section-title">
            <TrendingUp size={20} />
            <h2>Новые возможности</h2>
          </div>
          <button className="dashboard-home__section-link" onClick={() => navigate('/student/opportunities')}>
            Все возможности <ChevronRight size={16} />
          </button>
        </div>
        <div className="dashboard-home__opportunities-grid">
          {recentOpportunities.slice(0, 6).map((opp, index) => (
            <motion.div
              key={opp.id}
              className="dashboard-home__opportunity-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              onClick={() => handleOpportunityClick(opp)}
            >
              <div className="dashboard-home__card-header">
                <div className="dashboard-home__card-badges">
                  <span className={`dashboard-home__type-badge dashboard-home__type-badge--${opp.type}`}>
                    {getTypeLabel(opp.type)}
                  </span>
                  <span className="dashboard-home__format-badge">
                    {getFormatLabel(opp.work_format)}
                  </span>
                </div>
              </div>
              <h3 className="dashboard-home__card-title">{opp.title}</h3>
              <div className="dashboard-home__card-company">
                {opp.company_logo ? (
                  <img src={opp.company_logo} alt={opp.company_name} />
                ) : (
                  <div className="dashboard-home__card-company-placeholder">
                    {opp.company_name?.[0] || '?'}
                  </div>
                )}
                <span>{opp.company_name}</span>
              </div>
              <div className="dashboard-home__card-meta">
                <div className="dashboard-home__card-meta-item">
                  <MapPin size={14} />
                  <span>{opp.city}</span>
                </div>
                {formatSalary(opp.salary_min, opp.salary_max) && (
                  <div className="dashboard-home__card-meta-item dashboard-home__card-salary">
                    {formatSalary(opp.salary_min, opp.salary_max)}
                  </div>
                )}
                <div className="dashboard-home__card-meta-item">
                  <Eye size={14} />
                  <span>{opp.views_count || 0}</span>
                </div>
              </div>
              <div className="dashboard-home__card-tags">
                {opp.tags?.slice(0, 3).map(tag => (
                  <span key={tag.id} className="dashboard-home__card-tag">{tag.name}</span>
                ))}
              </div>
              <div className="dashboard-home__card-footer">
                <span className="dashboard-home__card-time">
                  {timeAgo(opp.published_at || opp.created_at)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="dashboard-home__quick-actions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3>Быстрые действия</h3>
        <div className="dashboard-home__actions-grid">
          <button className="dashboard-home__action-btn" onClick={() => navigate('/student/opportunities')}>
            <Briefcase size={20} />
            <span>Найти стажировку</span>
          </button>
          <button className="dashboard-home__action-btn" onClick={() => navigate('/student/contacts')}>
            <Users size={20} />
            <span>Найти контакты</span>
          </button>
          <button className="dashboard-home__action-btn" onClick={() => navigate('/student/companies')}>
            <Building2 size={20} />
            <span>Компании</span>
          </button>
        </div>
      </motion.div>

      {/* Opportunity Detail Modal */}
      {selectedOpportunity && (
        <OpportunityDetailModal
          opportunity={selectedOpportunity}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onApply={handleApply}
          applying={applying}
        />
      )}
    </div>
  );
};

export default DashboardHomePage;