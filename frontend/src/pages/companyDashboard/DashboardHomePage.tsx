// frontend/src/pages/companyDashboard/DashboardHomePage.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Building2,
  Briefcase,
  Users,
  Eye,
  TrendingUp,
  Clock,
  PlusCircle,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Opportunity {
  id: number;
  title: string;
  type: string;
  status: string;
  moderation_status: string;
  views_count: number;
  applications_count: number;
  created_at: string;
}

interface Application {
  id: number;
  opportunity_id: number;
  opportunity_title: string;
  applicant_name: string;
  status: string;
  created_at: string;
}

interface CompanyStats {
  total_opportunities: number;
  active_opportunities: number;
  draft_opportunities: number;
  total_applications: number;
  pending_applications: number;
  total_views: number;
}

interface CompanyContext {
  user: any;
  refreshStats: () => void;
  stats: any;
}

const DashboardHomePage = () => {
  const navigate = useNavigate();
  const { user, refreshStats, stats } = useOutletContext<CompanyContext>();
  const [companyStats, setCompanyStats] = useState<CompanyStats | null>(null);
  const [recentOpportunities, setRecentOpportunities] = useState<Opportunity[]>([]);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
  const token = localStorage.getItem('access_token');
  if (!token) return;

  setLoading(true);
  try {
    // Получаем компанию текущего пользователя
    const userRes = await fetch('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    let companyId = null;
    if (userRes.ok) {
      const userData = await userRes.json();
      companyId = userData.company_id;
      
      if (companyId) {
        const companyRes = await fetch(`/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (companyRes.ok) {
          const companyData = await companyRes.json();
          setCompanyInfo(companyData);
        }
      }
    }

    // Получаем вакансии компании
    const opportunitiesRes = await fetch('/api/opportunities/my', {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (opportunitiesRes.ok) {
      const opportunities = await opportunitiesRes.json();
      setRecentOpportunities(opportunities.slice(0, 5));
      
      const active = opportunities.filter((o: any) => o.status === 'active').length;
      const draft = opportunities.filter((o: any) => o.status === 'draft').length;
      const totalViews = opportunities.reduce((sum: number, o: any) => sum + (o.views_count || 0), 0);
      
      setCompanyStats({
        total_opportunities: opportunities.length,
        active_opportunities: active,
        draft_opportunities: draft,
        total_applications: 0,
        pending_applications: 0,
        total_views: totalViews,
      });
      
      // Получаем отклики для каждой вакансии
      let allApplications: any[] = [];
      for (const opp of opportunities.slice(0, 5)) {
        try {
          const appsRes = await fetch(`/api/applications/opportunity/${opp.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (appsRes.ok) {
            const apps = await appsRes.json();
            const appsWithOpportunity = apps.map((app: any) => ({
              ...app,
              opportunity_title: opp.title,
              opportunity_id: opp.id,
              applicant_name: app.applicant?.display_name || `${app.applicant?.first_name} ${app.applicant?.last_name}`,
            }));
            allApplications = [...allApplications, ...appsWithOpportunity];
          }
        } catch (error) {
          console.error('Error fetching applications:', error);
        }
      }
      
      // Сортируем и берем последние 5
      const recentApps = allApplications
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      setRecentApplications(recentApps);
      
      const pending = allApplications.filter((a: any) => a.status === 'pending').length;
      setCompanyStats(prev => prev ? {
        ...prev,
        total_applications: allApplications.length,
        pending_applications: pending,
      } : null);
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return { label: 'Активна', color: '#33ff66' };
      case 'draft': return { label: 'Черновик', color: '#888' };
      case 'pending_moderation': return { label: 'На модерации', color: '#ffcc33' };
      case 'closed': return { label: 'Закрыта', color: '#ff3366' };
      case 'rejected': return { label: 'Отклонена', color: '#ff3366' };
      default: return { label: status, color: '#888' };
    }
  };

  const getApplicationStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'Новый', color: '#ffcc33' };
      case 'viewed': return { label: 'Просмотрен', color: '#33ccff' };
      case 'accepted': return { label: 'Принят', color: '#33ff66' };
      case 'rejected': return { label: 'Отклонен', color: '#ff3366' };
      case 'reserve': return { label: 'В резерве', color: '#ff9933' };
      default: return { label: status, color: '#888' };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="company-home__loading">
        <div className="spinner"></div>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div className="company-home">
      <motion.div
        className="company-home__welcome"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1>Добро пожаловать, {companyInfo?.display_name || user?.first_name}!</h1>
          <p>Управляйте вакансиями и отслеживайте отклики</p>
        </div>
        <div className="company-home__date">
          <Clock size={16} />
          <span>{new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="company-home__stats">
        <motion.div
          className="company-home__stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="company-home__stat-icon" style={{ background: 'linear-gradient(135deg, #33ccff, #33ff66)' }}>
            <Briefcase size={24} />
          </div>
          <div className="company-home__stat-info">
            <h3>{companyStats?.active_opportunities || 0}</h3>
            <p>Активных вакансий</p>
          </div>
        </motion.div>
        <motion.div
          className="company-home__stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="company-home__stat-icon" style={{ background: 'linear-gradient(135deg, #ffcc33, #ffaa00)' }}>
            <Users size={24} />
          </div>
          <div className="company-home__stat-info">
            <h3>{companyStats?.total_applications || 0}</h3>
            <p>Всего откликов</p>
          </div>
        </motion.div>
        <motion.div
          className="company-home__stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="company-home__stat-icon" style={{ background: 'linear-gradient(135deg, #ff3366, #cc33ff)' }}>
            <Eye size={24} />
          </div>
          <div className="company-home__stat-info">
            <h3>{companyStats?.total_views || 0}</h3>
            <p>Просмотров вакансий</p>
          </div>
        </motion.div>
        <motion.div
          className="company-home__stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="company-home__stat-icon" style={{ background: 'linear-gradient(135deg, #ffcc33, #ffaa00)' }}>
            <UserCheck size={24} />
          </div>
          <div className="company-home__stat-info">
            <h3>{companyStats?.pending_applications || 0}</h3>
            <p>Новых откликов</p>
          </div>
        </motion.div>
      </div>

      {/* Recent Opportunities & Applications */}
      <div className="company-home__sections">
        <div className="company-home__section-grid">
          {/* Recent Opportunities */}
          <motion.div
            className="company-home__section-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="company-home__section-header">
              <div className="company-home__section-title">
                <Briefcase size={20} />
                <h3>Последние вакансии</h3>
              </div>
              <button
                className="company-home__section-link"
                onClick={() => navigate('/company/opportunities')}
              >
                Все <ChevronRight size={14} />
              </button>
            </div>
            <div className="company-home__section-list">
              {recentOpportunities.length === 0 ? (
                <div className="company-home__section-empty">
                  <p>У вас пока нет вакансий</p>
                  <button 
                    className="company-home__create-btn"
                    onClick={() => navigate('/company/opportunities?action=create')}
                  >
                    <PlusCircle size={16} />
                    Создать вакансию
                  </button>
                </div>
              ) : (
                recentOpportunities.map(opp => {
                  const statusConfig = getStatusLabel(opp.moderation_status === 'pending' ? 'pending_moderation' : opp.status);
                  return (
                    <div key={opp.id} className="company-home__section-item">
                      <div className="company-home__section-item-info">
                        <div className="company-home__section-item-name">{opp.title}</div>
                        <div className="company-home__section-item-meta">
                          <span>{getTypeLabel(opp.type)}</span>
                          <span>• {opp.views_count} просмотров</span>
                          <span>• {opp.applications_count} откликов</span>
                          <span>• {formatDate(opp.created_at)}</span>
                        </div>
                      </div>
                      <div className="company-home__section-item-status" style={{ color: statusConfig.color }}>
                        {statusConfig.label}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* Recent Applications */}
          <motion.div
            className="company-home__section-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="company-home__section-header">
              <div className="company-home__section-title">
                <Users size={20} />
                <h3>Новые отклики</h3>
              </div>
              <button
                className="company-home__section-link"
                onClick={() => navigate('/company/applications')}
              >
                Все <ChevronRight size={14} />
              </button>
            </div>
            <div className="company-home__section-list">
              {recentApplications.length === 0 ? (
                <p className="company-home__section-empty-text">Новых откликов пока нет</p>
              ) : (
                recentApplications.map(app => {
                  const statusConfig = getApplicationStatusLabel(app.status);
                  return (
                    <div key={app.id} className="company-home__section-item">
                      <div className="company-home__section-item-info">
                        <div className="company-home__section-item-name">{app.applicant_name}</div>
                        <div className="company-home__section-item-meta">
                          <span>Вакансия: {app.opportunity_title}</span>
                          <span>• {formatDate(app.created_at)}</span>
                        </div>
                      </div>
                      <div className="company-home__section-item-status" style={{ color: statusConfig.color }}>
                        {statusConfig.label}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div
        className="company-home__quick-actions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <h3>Быстрые действия</h3>
        <div className="company-home__actions-grid">
          <button 
            className="company-home__action-btn company-home__action-btn--primary" 
            onClick={() => navigate('/company/opportunities?action=create')}
          >
            <PlusCircle size={20} />
            <span>Создать вакансию</span>
          </button>
          <button className="company-home__action-btn" onClick={() => navigate('/company/opportunities')}>
            <Briefcase size={20} />
            <span>Управлять вакансиями</span>
          </button>
          <button className="company-home__action-btn" onClick={() => navigate('/company/applications')}>
            <Users size={20} />
            <span>Просмотреть отклики</span>
          </button>
          <button className="company-home__action-btn" onClick={() => navigate('/company/profile')}>
            <Building2 size={20} />
            <span>Редактировать профиль</span>
          </button>
        </div>
      </motion.div>

      {/* Verification Status Alert */}
      {companyInfo?.verification_status !== 'verified' && (
        <motion.div
          className="company-home__verification-alert"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="company-home__verification-icon">⚠️</div>
          <div className="company-home__verification-content">
            <h4>Профиль компании не верифицирован</h4>
            <p>
              {companyInfo?.verification_status === 'pending' 
                ? 'Ваша компания находится на проверке. После верификации вы сможете публиковать вакансии без модерации.'
                : 'Для публикации вакансий необходимо пройти верификацию компании.'}
            </p>
          </div>
          {companyInfo?.verification_status !== 'pending' && (
            <button 
              className="company-home__verification-btn"
              onClick={() => navigate('/company/profile')}
            >
              Пройти верификацию
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default DashboardHomePage;