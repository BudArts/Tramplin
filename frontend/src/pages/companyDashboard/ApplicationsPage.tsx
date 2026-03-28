// frontend/src/pages/companyDashboard/ApplicationsPage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  X,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronRight,
  Calendar,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  Star,
  MessageSquare,
  Download,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Application {
  id: number;
  applicant_id: number;
  opportunity_id: number;
  opportunity_title: string;
  status: 'pending' | 'viewed' | 'accepted' | 'rejected' | 'reserve';
  cover_letter?: string;
  created_at: string;
  updated_at: string;
  applicant: {
    id: number;
    first_name: string;
    last_name: string;
    display_name?: string;
    email: string;
    phone?: string;
    avatar_url?: string;
    university?: string;
    faculty?: string;
    course?: number;
    graduation_year?: number;
    bio?: string;
    resume_url?: string;
    portfolio_url?: string;
    github_url?: string;
    skills?: Array<{ id: number; name: string }>;
  };
}

interface Recommendation {
  id: number;
  from_user: {
    id: number;
    first_name: string;
    last_name: string;
    display_name?: string;
    avatar_url?: string;
    university?: string;
  };
  recommended_user?: {
    id: number;
    first_name: string;
    last_name: string;
    display_name?: string;
    avatar_url?: string;
    university?: string;
    email?: string;
    phone?: string;
    skills?: Array<{ id: number; name: string }>;
  };
  opportunity_id: number;
  opportunity_title: string;
  message?: string;
  is_read: boolean;
  created_at: string;
}

interface Opportunity {
  id: number;
  title: string;
}

interface CompanyContext {
  user: any;
  refreshStats: () => void;
  stats: any;
}

const ApplicationsPage = () => {
  const navigate = useNavigate();
  const { refreshStats } = useOutletContext<CompanyContext>();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState<Recommendation[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [opportunityFilter, setOpportunityFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'application' | 'recommendation'>('application');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'applications' | 'recommendations'>('applications');

  useEffect(() => {
    fetchApplications();
    fetchOpportunities();
    fetchRecommendations();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchQuery, statusFilter, opportunityFilter]);

  useEffect(() => {
    filterRecommendations();
  }, [recommendations, searchQuery, opportunityFilter]);

  const fetchApplications = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      const opportunitiesRes = await fetch('/api/opportunities/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (opportunitiesRes.ok) {
        const opportunitiesData = await opportunitiesRes.json();
        setOpportunities(opportunitiesData);
        
        let allApplications: Application[] = [];
        
        for (const opp of opportunitiesData) {
          try {
            const appsRes = await fetch(`/api/applications/opportunity/${opp.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (appsRes.ok) {
              const apps = await appsRes.json();
              const appsWithOpportunity = apps.map((app: any) => ({
                id: app.id,
                applicant_id: app.applicant_id,
                opportunity_id: opp.id,
                opportunity_title: opp.title,
                status: app.status,
                cover_letter: app.cover_letter,
                created_at: app.created_at,
                updated_at: app.updated_at,
                applicant: app.applicant,
              }));
              allApplications = [...allApplications, ...appsWithOpportunity];
            }
          } catch (error) {
            console.error(`Error fetching applications for opportunity ${opp.id}:`, error);
          }
        }
        
        allApplications.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setApplications(allApplications);
        setFilteredApplications(allApplications);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOpportunities = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch('/api/opportunities/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setOpportunities(data);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
  };

  const fetchRecommendations = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch('/companies/recommendations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
        setFilteredRecommendations(data);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const filterApplications = () => {
    let filtered = [...applications];
    
    if (searchQuery) {
      filtered = filtered.filter(app =>
        app.applicant?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.applicant?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.opportunity_title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }
    
    if (opportunityFilter !== 'all') {
      filtered = filtered.filter(app => app.opportunity_id === parseInt(opportunityFilter));
    }
    
    setFilteredApplications(filtered);
  };

  const filterRecommendations = () => {
    let filtered = [...recommendations];
    
    if (searchQuery) {
      filtered = filtered.filter(rec =>
        rec.from_user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.from_user?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.recommended_user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.recommended_user?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.opportunity_title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (opportunityFilter !== 'all') {
      filtered = filtered.filter(rec => rec.opportunity_id === parseInt(opportunityFilter));
    }
    
    setFilteredRecommendations(filtered);
  };

  const updateApplicationStatus = async (applicationId: number, status: string) => {
    setActionLoading(applicationId);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await fetchApplications();
        refreshStats();
        if (modalOpen) setModalOpen(false);
        alert(`Статус отклика изменен на ${getStatusLabel(status).label}`);
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при изменении статуса');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(null);
    }
  };

  const markRecommendationAsRead = async (recommendationId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/companies/recommendations/${recommendationId}/read`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
      });
      if (response.ok) {
        setRecommendations(prev =>
          prev.map(r => r.id === recommendationId ? { ...r, is_read: true } : r)
        );
        // Обновляем статистику
        if (refreshStats) refreshStats();
      }
    } catch (error) {
      console.error('Error marking recommendation as read:', error);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'Новый', color: '#ffcc33', icon: Clock };
      case 'viewed': return { label: 'Просмотрен', color: '#33ccff', icon: Eye };
      case 'accepted': return { label: 'Принят', color: '#33ff66', icon: CheckCircle };
      case 'rejected': return { label: 'Отклонен', color: '#ff3366', icon: XCircle };
      case 'reserve': return { label: 'В резерве', color: '#ff9933', icon: Clock };
      default: return { label: status, color: '#888', icon: Clock };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusOptions = [
    { value: 'all', label: 'Все' },
    { value: 'pending', label: 'Новые' },
    { value: 'viewed', label: 'Просмотренные' },
    { value: 'accepted', label: 'Принятые' },
    { value: 'rejected', label: 'Отклоненные' },
    { value: 'reserve', label: 'В резерве' },
  ];

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    viewed: applications.filter(a => a.status === 'viewed').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    reserve: applications.filter(a => a.status === 'reserve').length,
  };

  const getApplicantName = (applicant: Application['applicant']) => {
    if (!applicant) return 'Соискатель';
    if (applicant.display_name) return applicant.display_name;
    if (applicant.first_name && applicant.last_name) {
      return `${applicant.first_name} ${applicant.last_name}`;
    }
    if (applicant.first_name) return applicant.first_name;
    if (applicant.last_name) return applicant.last_name;
    return applicant.email || 'Соискатель';
  };

  const getUserName = (user: Recommendation['from_user'] | Recommendation['recommended_user']) => {
    if (!user) return 'Пользователь';
    if (user.display_name) return user.display_name;
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
    return 'Пользователь';
  };

  if (loading) {
    return (
      <div className="company-applications__loading">
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="company-applications">
      <motion.div
        className="company-applications__header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Управление откликами и рекомендациями</h1>
        <p>Просмотр и обработка откликов на ваши вакансии, а также рекомендации от студентов</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="company-applications__stats">
        <div className="company-applications__stat-card">
          <div className="company-applications__stat-icon" style={{ background: '#33ccff20', color: '#33ccff' }}>
            <Users size={20} />
          </div>
          <div className="company-applications__stat-info">
            <span className="company-applications__stat-value">{stats.total}</span>
            <span className="company-applications__stat-label">Всего откликов</span>
          </div>
        </div>
        <div className="company-applications__stat-card">
          <div className="company-applications__stat-icon" style={{ background: '#ffcc3320', color: '#ffcc33' }}>
            <Clock size={20} />
          </div>
          <div className="company-applications__stat-info">
            <span className="company-applications__stat-value">{stats.pending}</span>
            <span className="company-applications__stat-label">Новые отклики</span>
          </div>
        </div>
        <div className="company-applications__stat-card">
          <div className="company-applications__stat-icon" style={{ background: '#33ff6620', color: '#33ff66' }}>
            <CheckCircle size={20} />
          </div>
          <div className="company-applications__stat-info">
            <span className="company-applications__stat-value">{stats.accepted}</span>
            <span className="company-applications__stat-label">Приняты</span>
          </div>
        </div>
        <div className="company-applications__stat-card">
          <div className="company-applications__stat-icon" style={{ background: '#ffcc3320', color: '#ffcc33' }}>
            <Star size={20} />
          </div>
          <div className="company-applications__stat-info">
            <span className="company-applications__stat-value">{recommendations.length}</span>
            <span className="company-applications__stat-label">Рекомендаций</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="company-applications__tabs">
        <button
          className={`company-applications__tab ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          <Users size={18} />
          <span>Отклики</span>
          {stats.pending > 0 && <span className="company-applications__tab-badge">{stats.pending}</span>}
        </button>
        <button
          className={`company-applications__tab ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          <Star size={18} />
          <span>Рекомендации</span>
          {recommendations.filter(r => !r.is_read).length > 0 && (
            <span className="company-applications__tab-badge">{recommendations.filter(r => !r.is_read).length}</span>
          )}
        </button>
      </div>

      {/* Toolbar */}
      <div className="company-applications__toolbar">
        <div className="company-applications__search">
          <Search size={20} />
          <input
            type="text"
            placeholder={activeTab === 'applications' ? "Поиск по имени соискателя или вакансии..." : "Поиск по имени, вакансии..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <button
          className={`company-applications__filter-toggle ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} />
          <span>Фильтры</span>
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          className="company-applications__filters"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="company-applications__filter-group">
            <label>Вакансия</label>
            <select value={opportunityFilter} onChange={(e) => setOpportunityFilter(e.target.value)}>
              <option value="all">Все вакансии</option>
              {opportunities.map(opp => (
                <option key={opp.id} value={opp.id}>{opp.title}</option>
              ))}
            </select>
          </div>
          {activeTab === 'applications' && (
            <div className="company-applications__filter-group">
              <label>Статус</label>
              <div className="company-applications__status-filters">
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    className={`company-applications__status-filter ${statusFilter === option.value ? 'active' : ''}`}
                    onClick={() => setStatusFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Content */}
      {activeTab === 'applications' ? (
        <div className="company-applications__list">
          {filteredApplications.length === 0 ? (
            <div className="company-applications__empty">
              <div className="company-applications__empty-icon"><Users size={48} /></div>
              <h3>Нет откликов</h3>
              <p>{searchQuery || statusFilter !== 'all' ? 'Попробуйте изменить параметры поиска' : 'На ваши вакансии пока никто не откликнулся'}</p>
            </div>
          ) : (
            filteredApplications.map((app, index) => {
              const statusConfig = getStatusLabel(app.status);
              const StatusIcon = statusConfig.icon;
              return (
                <motion.div
                  key={app.id}
                  className="company-applications__card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => {
                    setSelectedApplication(app);
                    setModalType('application');
                    setModalOpen(true);
                  }}
                >
                  <div className="company-applications__card-header">
                    <div className="company-applications__card-avatar">
                      {app.applicant?.avatar_url ? (
                        <img src={app.applicant.avatar_url} alt="" />
                      ) : (
                        <div className="company-applications__card-avatar-placeholder">
                          {app.applicant?.first_name?.[0]}{app.applicant?.last_name?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="company-applications__card-info">
                      <div className="company-applications__card-name">
                        {getApplicantName(app.applicant)}
                      </div>
                      <div className="company-applications__card-opportunity">
                        <Briefcase size={12} />
                        <span>{app.opportunity_title}</span>
                      </div>
                      {app.applicant?.university && (
                        <div className="company-applications__card-university">
                          <GraduationCap size={12} />
                          <span>{app.applicant.university}</span>
                          {app.applicant.course && <span>, {app.applicant.course} курс</span>}
                        </div>
                      )}
                    </div>
                    <div className="company-applications__card-status" style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}>
                      <StatusIcon size={12} />
                      <span>{statusConfig.label}</span>
                    </div>
                  </div>
                  <div className="company-applications__card-footer">
                    <div className="company-applications__card-date">
                      <Calendar size={12} />
                      <span>{formatDate(app.created_at)}</span>
                    </div>
                    <div className="company-applications__card-actions">
                      <button className="company-applications__card-btn" onClick={(e) => {
                        e.stopPropagation();
                        setSelectedApplication(app);
                        setModalType('application');
                        setModalOpen(true);
                      }}>
                        <Eye size={14} />
                        <span>Подробнее</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      ) : (
        <div className="company-applications__list">
          {filteredRecommendations.length === 0 ? (
            <div className="company-applications__empty">
              <div className="company-applications__empty-icon"><Star size={48} /></div>
              <h3>Нет рекомендаций</h3>
              <p>Когда студенты будут рекомендовать своих друзей на ваши вакансии, они появятся здесь</p>
            </div>
          ) : (
            filteredRecommendations.map((rec, index) => (
              <motion.div
                key={rec.id}
                className={`company-applications__recommendation-card ${!rec.is_read ? 'unread' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => {
                  setSelectedRecommendation(rec);
                  setModalType('recommendation');
                  setModalOpen(true);
                  if (!rec.is_read) {
                    markRecommendationAsRead(rec.id);
                  }
                }}
              >
                <div className="company-applications__recommendation-header">
                  <div className="company-applications__recommendation-avatar">
                    {rec.from_user.avatar_url ? (
                      <img src={rec.from_user.avatar_url} alt="" />
                    ) : (
                      <div className="company-applications__recommendation-avatar-placeholder">
                        {rec.from_user.first_name?.[0]}{rec.from_user.last_name?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="company-applications__recommendation-info">
                    <div className="company-applications__recommendation-name">
                      {getUserName(rec.from_user)}
                    </div>
                    <div className="company-applications__recommendation-university">
                      {rec.from_user.university || 'Студент'}
                    </div>
                  </div>
                  <div className="company-applications__recommendation-badge">
                    <Star size={14} fill="#ffcc33" stroke="#ffcc33" />
                    <span>Рекомендовал(а) друга</span>
                  </div>
                </div>

                <div className="company-applications__recommendation-opportunity">
                  <Briefcase size={14} />
                  <span>На вакансию: <strong>{rec.opportunity_title}</strong></span>
                </div>

                {rec.recommended_user && (
                  <div className="company-applications__recommendation-recommended">
                    <Users size={14} />
                    <span>Рекомендуемый кандидат: <strong>{getUserName(rec.recommended_user)}</strong></span>
                    {rec.recommended_user.university && (
                      <span className="company-applications__recommendation-recommended-university">
                        ({rec.recommended_user.university})
                      </span>
                    )}
                  </div>
                )}

                {rec.message && (
                  <div className="company-applications__recommendation-message">
                    <MessageSquare size={14} />
                    <p>"{rec.message}"</p>
                  </div>
                )}

                <div className="company-applications__recommendation-footer">
                  <div className="company-applications__recommendation-date">
                    <Calendar size={12} />
                    <span>{formatDate(rec.created_at)}</span>
                  </div>
                  <button className="company-applications__recommendation-btn" onClick={(e) => {
                    e.stopPropagation();
                    if (rec.recommended_user) {
                      navigate(`/company/student/user/${rec.recommended_user.id}`);
                    }
                  }}>
                    <Eye size={14} />
                    <span>Просмотреть профиль</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Application Detail Modal */}
      <AnimatePresence>
        {modalOpen && modalType === 'application' && selectedApplication && (
          <motion.div
            className="company-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              className="company-modal__content company-modal__content--large"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="company-modal__close" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>

              <div className="company-applications__modal-header">
                <div className="company-applications__modal-avatar">
                  {selectedApplication.applicant?.avatar_url ? (
                    <img src={selectedApplication.applicant.avatar_url} alt="" />
                  ) : (
                    <div className="company-applications__modal-avatar-placeholder">
                      {selectedApplication.applicant?.first_name?.[0]}
                      {selectedApplication.applicant?.last_name?.[0]}
                    </div>
                  )}
                </div>
                <div className="company-applications__modal-info">
                  <h2>{getApplicantName(selectedApplication.applicant)}</h2>
                  <p className="company-applications__modal-email">
                    <Mail size={14} />
                    <span>{selectedApplication.applicant?.email}</span>
                  </p>
                  {selectedApplication.applicant?.phone && (
                    <p className="company-applications__modal-phone">
                      <Phone size={14} />
                      <span>{selectedApplication.applicant.phone}</span>
                    </p>
                  )}
                </div>
                <div className="company-applications__modal-status">
                  <div className="company-applications__modal-status-badge" style={{
                    backgroundColor: getStatusLabel(selectedApplication.status).color + '20',
                    color: getStatusLabel(selectedApplication.status).color
                  }}>
                    {getStatusLabel(selectedApplication.status).label}
                  </div>
                </div>
              </div>

              <div className="company-applications__modal-section">
                <h3>Вакансия</h3>
                <div className="company-applications__modal-opportunity">
                  <Briefcase size={16} />
                  <span>{selectedApplication.opportunity_title}</span>
                </div>
                <div className="company-applications__modal-date">
                  <Calendar size={14} />
                  <span>Отклик получен: {formatDate(selectedApplication.created_at)}</span>
                </div>
              </div>

              {selectedApplication.cover_letter && (
                <div className="company-applications__modal-section">
                  <h3>Сопроводительное письмо</h3>
                  <div className="company-applications__modal-cover-letter">
                    <MessageSquare size={16} />
                    <p>{selectedApplication.cover_letter}</p>
                  </div>
                </div>
              )}

              {selectedApplication.applicant?.bio && (
                <div className="company-applications__modal-section">
                  <h3>О соискателе</h3>
                  <p className="company-applications__modal-bio">{selectedApplication.applicant.bio}</p>
                </div>
              )}

              {selectedApplication.applicant?.skills && selectedApplication.applicant.skills.length > 0 && (
                <div className="company-applications__modal-section">
                  <h3>Навыки</h3>
                  <div className="company-applications__modal-skills">
                    {selectedApplication.applicant.skills.map(skill => (
                      <span key={skill.id} className="company-applications__modal-skill">{skill.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedApplication.applicant?.university && (
                <div className="company-applications__modal-section">
                  <h3>Образование</h3>
                  <div className="company-applications__modal-education">
                    <GraduationCap size={16} />
                    <div>
                      <p>{selectedApplication.applicant.university}</p>
                      {selectedApplication.applicant.faculty && <p>Факультет: {selectedApplication.applicant.faculty}</p>}
                      {selectedApplication.applicant.course && <p>Курс: {selectedApplication.applicant.course}</p>}
                      {selectedApplication.applicant.graduation_year && <p>Год выпуска: {selectedApplication.applicant.graduation_year}</p>}
                    </div>
                  </div>
                </div>
              )}

              <div className="company-applications__modal-links">
                {selectedApplication.applicant?.resume_url && (
                  <a href={selectedApplication.applicant.resume_url} target="_blank" rel="noopener noreferrer" className="company-applications__modal-link">
                    <Download size={16} />
                    <span>Скачать резюме</span>
                  </a>
                )}
                {selectedApplication.applicant?.portfolio_url && (
                  <a href={selectedApplication.applicant.portfolio_url} target="_blank" rel="noopener noreferrer" className="company-applications__modal-link">
                    <Star size={16} />
                    <span>Портфолио</span>
                  </a>
                )}
                {selectedApplication.applicant?.github_url && (
                  <a href={selectedApplication.applicant.github_url} target="_blank" rel="noopener noreferrer" className="company-applications__modal-link">
                    <Star size={16} />
                    <span>GitHub</span>
                  </a>
                )}
                <button
                  className="company-applications__modal-link"
                  onClick={() => {
                    setModalOpen(false);
                    navigate(`/company/student/user/${selectedApplication.applicant_id}`);
                  }}
                >
                  <Eye size={16} />
                  <span>Полный профиль</span>
                </button>
              </div>

              <div className="company-applications__modal-actions">
                {selectedApplication.status === 'pending' && (
                  <>
                    <button
                      className="company-applications__action-btn company-applications__action-btn--view"
                      onClick={() => updateApplicationStatus(selectedApplication.id, 'viewed')}
                      disabled={actionLoading === selectedApplication.id}
                    >
                      {actionLoading === selectedApplication.id ? <Loader2 size={18} className="spinner" /> : <Eye size={18} />}
                      <span>Отметить просмотренным</span>
                    </button>
                  </>
                )}
                {(selectedApplication.status === 'pending' || selectedApplication.status === 'viewed') && (
                  <>
                    <button
                      className="company-applications__action-btn company-applications__action-btn--accept"
                      onClick={() => updateApplicationStatus(selectedApplication.id, 'accepted')}
                      disabled={actionLoading === selectedApplication.id}
                    >
                      {actionLoading === selectedApplication.id ? <Loader2 size={18} className="spinner" /> : <CheckCircle size={18} />}
                      <span>Принять</span>
                    </button>
                    <button
                      className="company-applications__action-btn company-applications__action-btn--reserve"
                      onClick={() => updateApplicationStatus(selectedApplication.id, 'reserve')}
                      disabled={actionLoading === selectedApplication.id}
                    >
                      {actionLoading === selectedApplication.id ? <Loader2 size={18} className="spinner" /> : <Clock size={18} />}
                      <span>В резерв</span>
                    </button>
                    <button
                      className="company-applications__action-btn company-applications__action-btn--reject"
                      onClick={() => updateApplicationStatus(selectedApplication.id, 'rejected')}
                      disabled={actionLoading === selectedApplication.id}
                    >
                      {actionLoading === selectedApplication.id ? <Loader2 size={18} className="spinner" /> : <XCircle size={18} />}
                      <span>Отклонить</span>
                    </button>
                  </>
                )}
                {selectedApplication.status === 'reserve' && (
                  <button
                    className="company-applications__action-btn company-applications__action-btn--accept"
                    onClick={() => updateApplicationStatus(selectedApplication.id, 'accepted')}
                    disabled={actionLoading === selectedApplication.id}
                  >
                    {actionLoading === selectedApplication.id ? <Loader2 size={18} className="spinner" /> : <CheckCircle size={18} />}
                    <span>Принять из резерва</span>
                  </button>
                )}
                <button
                  className="company-applications__action-btn company-applications__action-btn--chat"
                  onClick={() => {
                    setModalOpen(false);
                    navigate(`/company/chat/${selectedApplication.applicant_id}`, {
                      state: { opportunity_id: selectedApplication.opportunity_id }
                    });
                  }}
                >
                  <MessageSquare size={18} />
                  <span>Написать сообщение</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recommendation Detail Modal */}
      <AnimatePresence>
        {modalOpen && modalType === 'recommendation' && selectedRecommendation && (
          <motion.div
            className="company-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              className="company-modal__content company-modal__content--large"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="company-modal__close" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>

              <div className="company-applications__modal-header">
                <div className="company-applications__modal-avatar">
                  {selectedRecommendation.from_user.avatar_url ? (
                    <img src={selectedRecommendation.from_user.avatar_url} alt="" />
                  ) : (
                    <div className="company-applications__modal-avatar-placeholder">
                      {selectedRecommendation.from_user.first_name?.[0]}
                      {selectedRecommendation.from_user.last_name?.[0]}
                    </div>
                  )}
                </div>
                <div className="company-applications__modal-info">
                  <h2>{getUserName(selectedRecommendation.from_user)}</h2>
                  <p className="company-applications__modal-email">
                    <Star size={14} fill="#ffcc33" stroke="#ffcc33" />
                    <span>Рекомендовал(а) кандидата на вашу вакансию</span>
                  </p>
                  {selectedRecommendation.from_user.university && (
                    <p className="company-applications__modal-phone">
                      <GraduationCap size={14} />
                      <span>{selectedRecommendation.from_user.university}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="company-applications__modal-section">
                <h3>Вакансия</h3>
                <div className="company-applications__modal-opportunity">
                  <Briefcase size={16} />
                  <span>{selectedRecommendation.opportunity_title}</span>
                </div>
                <div className="company-applications__modal-date">
                  <Calendar size={14} />
                  <span>Рекомендация получена: {formatDate(selectedRecommendation.created_at)}</span>
                </div>
              </div>

              {selectedRecommendation.recommended_user && (
                <div className="company-applications__modal-section">
                  <h3>Рекомендуемый кандидат</h3>
                  <div className="company-applications__modal-recommended">
                    <div className="company-applications__modal-recommended-avatar">
                      {selectedRecommendation.recommended_user.avatar_url ? (
                        <img src={selectedRecommendation.recommended_user.avatar_url} alt="" />
                      ) : (
                        <div className="company-applications__modal-recommended-avatar-placeholder">
                          {selectedRecommendation.recommended_user.first_name?.[0]}
                          {selectedRecommendation.recommended_user.last_name?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="company-applications__modal-recommended-info">
                      <h4>{getUserName(selectedRecommendation.recommended_user)}</h4>
                      {selectedRecommendation.recommended_user.email && (
                        <p><Mail size={12} /> {selectedRecommendation.recommended_user.email}</p>
                      )}
                      {selectedRecommendation.recommended_user.university && (
                        <p><GraduationCap size={12} /> {selectedRecommendation.recommended_user.university}</p>
                      )}
                      {selectedRecommendation.recommended_user.skills && selectedRecommendation.recommended_user.skills.length > 0 && (
                        <div className="company-applications__modal-recommended-skills">
                          {selectedRecommendation.recommended_user.skills.slice(0, 5).map(skill => (
                            <span key={skill.id} className="company-applications__modal-skill">{skill.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedRecommendation.message && (
                <div className="company-applications__modal-section">
                  <h3>Сообщение от рекомендующего</h3>
                  <div className="company-applications__modal-cover-letter">
                    <MessageSquare size={16} />
                    <p>{selectedRecommendation.message}</p>
                  </div>
                </div>
              )}

              <div className="company-applications__modal-actions">
                {selectedRecommendation.recommended_user && (
                  <>
                    <button
                      className="company-applications__action-btn company-applications__action-btn--accept"
                      onClick={() => {
                        setModalOpen(false);
                        navigate(`/company/chat/${selectedRecommendation.recommended_user?.id}`, {
                          state: { opportunity_id: selectedRecommendation.opportunity_id }
                        });
                      }}
                    >
                      <MessageSquare size={18} />
                      <span>Написать кандидату</span>
                    </button>
                    <button
                      className="company-applications__action-btn company-applications__action-btn--view"
                      onClick={() => {
                        setModalOpen(false);
                        navigate(`/company/student/user/${selectedRecommendation.recommended_user?.id}`);
                      }}
                    >
                      <Eye size={18} />
                      <span>Просмотреть профиль</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ApplicationsPage;