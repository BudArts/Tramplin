// frontend/src/pages/companyDashboard/OpportunitiesPage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Calendar,
  MapPin,
  Users,
  Filter,
  Clock,
  Copy,
  BarChart3,
  MessageCircle,
} from 'lucide-react';
import OpportunityForm from './OpportunityForm';
import { useAuth } from '../../hooks/useAuth';

interface Opportunity {
  id: number;
  title: string;
  description: string;
  type: 'internship' | 'vacancy' | 'mentorship' | 'event';
  work_format: 'office' | 'hybrid' | 'remote';
  salary_min?: number;
  salary_max?: number;
  city: string;
  address?: string;
  status: 'draft' | 'pending_moderation' | 'active' | 'scheduled' | 'closed' | 'rejected';
  moderation_status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  moderation_comment?: string;
  views_count: number;
  applications_count: number;
  created_at: string;
  published_at?: string;
  expires_at?: string;
  event_date?: string;
  tags: Array<{ id: number; name: string }>;
}

interface CompanyContext {
  user: any;
  refreshStats: () => void;
  stats: any;
}

const OpportunitiesPage = () => {
  const navigate = useNavigate();
  const { opportunityId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshStats } = useOutletContext<CompanyContext>();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsData, setStatsData] = useState<any>(null);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  useEffect(() => {
    if (opportunityId && !modalOpen && opportunities.length > 0) {
      const opportunity = opportunities.find(o => o.id === parseInt(opportunityId));
      if (opportunity) {
        handleOpportunityClick(opportunity);
      }
    }
  }, [opportunityId, opportunities]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create') {
      setEditingOpportunity(null);
      setFormModalOpen(true);
      setSearchParams({});
    }
  }, [searchParams]);

  useEffect(() => {
    filterOpportunities();
  }, [opportunities, searchQuery, statusFilter, typeFilter]);

  const fetchOpportunities = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/opportunities/my', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setOpportunities(data);
        setFilteredOpportunities(data);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOpportunities = () => {
    let filtered = [...opportunities];
    
    if (searchQuery) {
      filtered = filtered.filter(opp =>
        opp.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(opp => opp.status === statusFilter);
    }
    
    if (typeFilter) {
      filtered = filtered.filter(opp => opp.type === typeFilter);
    }
    
    setFilteredOpportunities(filtered);
  };

  const handleOpportunityClick = async (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setModalOpen(true);
    navigate(`/company/opportunities/${opportunity.id}`, { replace: true });
  };

  const fetchOpportunityStats = async (opportunityId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setActionLoading(opportunityId);
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStatsData(data);
        setStatsModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const updateOpportunityStatus = async (opportunityId: number, status: string) => {
    setActionLoading(opportunityId);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await fetchOpportunities();
        refreshStats();
        if (modalOpen) setModalOpen(false);
        alert(status === 'closed' ? 'Вакансия закрыта' : 'Статус вакансии обновлен');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при обновлении статуса');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteOpportunity = async (opportunityId: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту вакансию? Это действие нельзя отменить.')) return;
    
    setActionLoading(opportunityId);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        // Немедленное обновление локального состояния
        const updatedOpportunities = opportunities.filter(opp => opp.id !== opportunityId);
        setOpportunities(updatedOpportunities);
        setFilteredOpportunities(prev => prev.filter(opp => opp.id !== opportunityId));
        
        refreshStats();
        
        // Закрываем модальное окно, если оно открыто
        if (modalOpen) {
          setModalOpen(false);
          navigate('/company/opportunities');
        }
        
        alert('Вакансия удалена');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при удалении');
        // Синхронизация с сервером в случае ошибки
        await fetchOpportunities();
      }
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      alert('Ошибка сети');
      // Синхронизация с сервером в случае ошибки сети
      await fetchOpportunities();
    } finally {
      setActionLoading(null);
    }
  };

  const duplicateOpportunity = async (opportunity: Opportunity) => {
    setActionLoading(opportunity.id);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch('/api/opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: `${opportunity.title} (копия)`,
          description: opportunity.description,
          type: opportunity.type,
          work_format: opportunity.work_format,
          salary_min: opportunity.salary_min,
          salary_max: opportunity.salary_max,
          address: opportunity.address,
          city: opportunity.city,
          tag_ids: opportunity.tags.map(t => t.id),
        }),
      });

      if (response.ok) {
        await fetchOpportunities();
        refreshStats();
        alert('Вакансия скопирована');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при копировании');
      }
    } catch (error) {
      console.error('Error duplicating opportunity:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(null);
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

  const getStatusLabel = (status: string, moderationStatus?: string) => {
    if (moderationStatus === 'pending') {
      return { label: 'На модерации', color: '#ffcc33', icon: Clock };
    }
    if (moderationStatus === 'changes_requested') {
      return { label: 'Требует доработки', color: '#ff9933', icon: AlertCircle };
    }
    if (moderationStatus === 'rejected') {
      return { label: 'Отклонена', color: '#ff3366', icon: XCircle };
    }
    switch (status) {
      case 'active': return { label: 'Активна', color: '#33ff66', icon: CheckCircle };
      case 'draft': return { label: 'Черновик', color: '#888', icon: Edit };
      case 'scheduled': return { label: 'Запланирована', color: '#33ccff', icon: Calendar };
      case 'closed': return { label: 'Закрыта', color: '#ff3366', icon: XCircle };
      default: return { label: status, color: '#888', icon: AlertCircle };
    }
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null;
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()} ₽`;
    if (min) return `от ${min.toLocaleString()} ₽`;
    if (max) return `до ${max.toLocaleString()} ₽`;
    return null;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const statusOptions = [
    { value: 'all', label: 'Все' },
    { value: 'active', label: 'Активные' },
    { value: 'pending_moderation', label: 'На модерации' },
    { value: 'draft', label: 'Черновики' },
    { value: 'closed', label: 'Закрытые' },
  ];

  const typeOptions = [
    { value: '', label: 'Все типы' },
    { value: 'internship', label: 'Стажировки' },
    { value: 'vacancy', label: 'Вакансии' },
    { value: 'mentorship', label: 'Менторство' },
    { value: 'event', label: 'Мероприятия' },
  ];

  const maxChartValue = statsData?.applications_by_date?.length
    ? Math.max(...statsData.applications_by_date.map((d: any) => d.count), 1)
    : 1;

  if (loading) {
    return (
      <div className="company-opportunities__loading">
        <div className="spinner"></div>
        <p>Загрузка вакансий...</p>
      </div>
    );
  }

  return (
    <div className="company-opportunities">
      <motion.div
        className="company-opportunities__header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1>Управление вакансиями</h1>
          <p>Создание, редактирование и управление вакансиями компании</p>
        </div>
        <button 
          className="company-opportunities__create-btn"
          onClick={() => {
            setEditingOpportunity(null);
            setFormModalOpen(true);
          }}
        >
          <Plus size={20} />
          <span>Создать вакансию</span>
        </button>
      </motion.div>

      <div className="company-opportunities__toolbar">
        <div className="company-opportunities__search">
          <Search size={20} />
          <input
            type="text"
            placeholder="Поиск по названию..."
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
          className={`company-opportunities__filter-toggle ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} />
          <span>Фильтры</span>
        </button>
      </div>

      {showFilters && (
        <motion.div 
          className="company-opportunities__filters"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="company-opportunities__filter-group">
            <label>Статус</label>
            <div className="company-opportunities__status-filters">
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  className={`company-opportunities__status-filter ${statusFilter === option.value ? 'active' : ''}`}
                  onClick={() => setStatusFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="company-opportunities__filter-group">
            <label>Тип вакансии</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {typeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      <div className="company-opportunities__stats-bar">
        <div className="company-opportunities__stat">
          <span className="company-opportunities__stat-value">{opportunities.length}</span>
          <span className="company-opportunities__stat-label">Всего</span>
        </div>
        <div className="company-opportunities__stat">
          <span className="company-opportunities__stat-value">{opportunities.filter(o => o.status === 'active').length}</span>
          <span className="company-opportunities__stat-label">Активных</span>
        </div>
        <div className="company-opportunities__stat">
          <span className="company-opportunities__stat-value">{opportunities.filter(o => o.moderation_status === 'pending').length}</span>
          <span className="company-opportunities__stat-label">На модерации</span>
        </div>
        <div className="company-opportunities__stat">
          <span className="company-opportunities__stat-value">{opportunities.reduce((sum, o) => sum + (o.applications_count || 0), 0)}</span>
          <span className="company-opportunities__stat-label">Всего откликов</span>
        </div>
      </div>

      <div className="company-opportunities__list">
        {filteredOpportunities.length === 0 ? (
          <div className="company-opportunities__empty">
            <div className="company-opportunities__empty-icon"><Briefcase size={48} /></div>
            <h3>Нет вакансий</h3>
            <p>{searchQuery || statusFilter !== 'all' ? 'Попробуйте изменить параметры поиска' : 'Создайте свою первую вакансию'}</p>
            {!searchQuery && statusFilter === 'all' && (
              <button 
                className="company-opportunities__empty-btn"
                onClick={() => {
                  setEditingOpportunity(null);
                  setFormModalOpen(true);
                }}
              >
                <Plus size={18} />
                <span>Создать вакансию</span>
              </button>
            )}
          </div>
        ) : (
          filteredOpportunities.map((opp, index) => {
            const statusConfig = getStatusLabel(opp.status, opp.moderation_status);
            const StatusIcon = statusConfig.icon;
            const salary = formatSalary(opp.salary_min, opp.salary_max);
            const hasModerationComment = opp.moderation_status === 'changes_requested' && opp.moderation_comment;
            
            return (
              <motion.div
                key={opp.id}
                className={`company-opportunities__card ${hasModerationComment ? 'has-comment' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="company-opportunities__card-header">
                  <div className="company-opportunities__card-badges">
                    <span className={`company-opportunities__type-badge company-opportunities__type-badge--${opp.type}`}>
                      {getTypeLabel(opp.type)}
                    </span>
                    <span className="company-opportunities__format-badge">
                      {getFormatLabel(opp.work_format)}
                    </span>
                    <span className="company-opportunities__status-badge" style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}>
                      <StatusIcon size={12} />
                      <span>{statusConfig.label}</span>
                    </span>
                  </div>
                  {hasModerationComment && (
                    <div className="company-opportunities__moderation-comment-badge" title={opp.moderation_comment}>
                      <MessageCircle size={14} />
                    </div>
                  )}
                </div>
                
                <h3 className="company-opportunities__card-title">{opp.title}</h3>
                
                <div className="company-opportunities__card-meta">
                  <div className="company-opportunities__card-meta-item">
                    <MapPin size={14} />
                    <span>{opp.city}</span>
                  </div>
                  {salary && (
                    <div className="company-opportunities__card-meta-item company-opportunities__card-salary">
                      {salary}
                    </div>
                  )}
                  <div className="company-opportunities__card-meta-item">
                    <Calendar size={14} />
                    <span>{formatDate(opp.created_at)}</span>
                  </div>
                </div>
                
                {opp.tags && opp.tags.length > 0 && (
                  <div className="company-opportunities__card-tags">
                    {opp.tags.slice(0, 4).map(tag => (
                      <span key={tag.id} className="company-opportunities__card-tag">{tag.name}</span>
                    ))}
                    {opp.tags.length > 4 && (
                      <span className="company-opportunities__card-tag-more">+{opp.tags.length - 4}</span>
                    )}
                  </div>
                )}
                
                {/* Отображение комментария куратора прямо на карточке для статуса "Требует доработки" */}
                {hasModerationComment && (
                  <div className="company-opportunities__moderation-comment-preview">
                    <AlertCircle size={12} />
                    <span className="company-opportunities__moderation-comment-preview-text">
                      {opp.moderation_comment && opp.moderation_comment.length > 80 
                        ? `${opp.moderation_comment.substring(0, 80)}...` 
                        : opp.moderation_comment}
                    </span>
                  </div>
                )}
                
                <div className="company-opportunities__card-stats">
                  <div className="company-opportunities__card-stat">
                    <Eye size={14} />
                    <span>{opp.views_count || 0}</span>
                  </div>
                  <div className="company-opportunities__card-stat">
                    <Users size={14} />
                    <span>{opp.applications_count || 0}</span>
                  </div>
                </div>
                
                <div className="company-opportunities__card-actions">
                  <button 
                    className="company-opportunities__card-btn company-opportunities__card-btn--view"
                    onClick={() => handleOpportunityClick(opp)}
                  >
                    <Eye size={16} />
                    <span>Просмотр</span>
                  </button>
                  {opp.status !== 'closed' && opp.moderation_status !== 'rejected' && (
                    <button 
                      className="company-opportunities__card-btn company-opportunities__card-btn--edit"
                      onClick={() => {
                        setEditingOpportunity(opp);
                        setFormModalOpen(true);
                      }}
                    >
                      <Edit size={16} />
                      <span>Редактировать</span>
                    </button>
                  )}
                  <button 
                    className="company-opportunities__card-btn company-opportunities__card-btn--stats"
                    onClick={() => fetchOpportunityStats(opp.id)}
                    disabled={actionLoading === opp.id}
                  >
                    {actionLoading === opp.id ? <Loader2 size={16} className="spinner" /> : <BarChart3 size={16} />}
                    <span>Статистика</span>
                  </button>
                  <div className="company-opportunities__card-dropdown">
                    <button className="company-opportunities__card-btn company-opportunities__card-btn--more">
                      <ChevronRight size={16} />
                    </button>
                    <div className="company-opportunities__card-dropdown-menu">
                      <button onClick={() => duplicateOpportunity(opp)}>
                        <Copy size={14} />
                        <span>Копировать</span>
                      </button>
                      {opp.status === 'active' && (
                        <button onClick={() => updateOpportunityStatus(opp.id, 'closed')}>
                          <XCircle size={14} />
                          <span>Закрыть</span>
                        </button>
                      )}
                      {opp.status === 'closed' && (
                        <button onClick={() => updateOpportunityStatus(opp.id, 'active')}>
                          <CheckCircle size={14} />
                          <span>Активировать</span>
                        </button>
                      )}
                      <button 
                        className="company-opportunities__card-dropdown-danger"
                        onClick={() => deleteOpportunity(opp.id)}
                      >
                        <Trash2 size={14} />
                        <span>Удалить</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Opportunity Detail Modal */}
      <AnimatePresence>
        {modalOpen && selectedOpportunity && (
          <motion.div
            className="company-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setModalOpen(false);
              navigate('/company/opportunities');
            }}
          >
            <motion.div
              className="company-modal__content company-modal__content--large"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="company-modal__close" onClick={() => {
                setModalOpen(false);
                navigate('/company/opportunities');
              }}>
                <X size={20} />
              </button>

              <div className="company-modal__header">
                <div className="company-modal__info">
                  <h2>{selectedOpportunity.title}</h2>
                  <div className="company-modal__badges">
                    <span className={`company-modal__type-badge company-modal__type-badge--${selectedOpportunity.type}`}>
                      {getTypeLabel(selectedOpportunity.type)}
                    </span>
                    <span className="company-modal__format-badge">
                      {getFormatLabel(selectedOpportunity.work_format)}
                    </span>
                    <span className="company-modal__status-badge" style={{
                      backgroundColor: getStatusLabel(selectedOpportunity.status, selectedOpportunity.moderation_status).color + '20',
                      color: getStatusLabel(selectedOpportunity.status, selectedOpportunity.moderation_status).color
                    }}>
                      {getStatusLabel(selectedOpportunity.status, selectedOpportunity.moderation_status).label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="company-modal__info-grid">
                <div className="company-modal__info-item">
                  <MapPin size={16} />
                  <span>{selectedOpportunity.city}</span>
                </div>
                {selectedOpportunity.address && (
                  <div className="company-modal__info-item">
                    <MapPin size={16} />
                    <span>{selectedOpportunity.address}</span>
                  </div>
                )}
                {formatSalary(selectedOpportunity.salary_min, selectedOpportunity.salary_max) && (
                  <div className="company-modal__info-item company-modal__salary">
                    {formatSalary(selectedOpportunity.salary_min, selectedOpportunity.salary_max)}
                  </div>
                )}
                {selectedOpportunity.event_date && (
                  <div className="company-modal__info-item">
                    <Calendar size={16} />
                    <span>Дата мероприятия: {formatDate(selectedOpportunity.event_date)}</span>
                  </div>
                )}
                {selectedOpportunity.expires_at && (
                  <div className="company-modal__info-item">
                    <Clock size={16} />
                    <span>Действует до: {formatDate(selectedOpportunity.expires_at)}</span>
                  </div>
                )}
                <div className="company-modal__info-item">
                  <Eye size={16} />
                  <span>{selectedOpportunity.views_count} просмотров</span>
                </div>
                <div className="company-modal__info-item">
                  <Users size={16} />
                  <span>{selectedOpportunity.applications_count} откликов</span>
                </div>
                <div className="company-modal__info-item">
                  <Calendar size={16} />
                  <span>Создана: {formatDate(selectedOpportunity.created_at)}</span>
                </div>
                {selectedOpportunity.published_at && (
                  <div className="company-modal__info-item">
                    <Calendar size={16} />
                    <span>Опубликована: {formatDate(selectedOpportunity.published_at)}</span>
                  </div>
                )}
              </div>

              <div className="company-modal__description">
                <h4>Описание</h4>
                <p>{selectedOpportunity.description}</p>
              </div>

              {selectedOpportunity.tags && selectedOpportunity.tags.length > 0 && (
                <div className="company-modal__tags">
                  <h4>Навыки и технологии</h4>
                  <div className="company-modal__tags-list">
                    {selectedOpportunity.tags.map(tag => (
                      <span key={tag.id} className="company-modal__tag">{tag.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Блок с комментарием модератора */}
              {selectedOpportunity.moderation_comment && (
                <div className={`company-modal__comment ${selectedOpportunity.moderation_status === 'changes_requested' ? 'company-modal__comment--warning' : ''}`}>
                  <h4>
                    {selectedOpportunity.moderation_status === 'changes_requested' && <AlertCircle size={16} />}
                    {selectedOpportunity.moderation_status === 'changes_requested' ? 'Комментарий куратора' : 'Комментарий модератора'}
                  </h4>
                  <p>{selectedOpportunity.moderation_comment}</p>
                </div>
              )}

              <div className="company-modal__actions">
                {selectedOpportunity.moderation_status === 'changes_requested' && (
                  <button
                    className="company-modal__action-btn company-modal__action-btn--edit"
                    onClick={() => {
                      setModalOpen(false);
                      setEditingOpportunity(selectedOpportunity);
                      setFormModalOpen(true);
                    }}
                  >
                    <Edit size={18} />
                    <span>Внести изменения</span>
                  </button>
                )}
                {selectedOpportunity.status === 'active' && (
                  <button
                    className="company-modal__action-btn company-modal__action-btn--close"
                    onClick={() => updateOpportunityStatus(selectedOpportunity.id, 'closed')}
                    disabled={actionLoading === selectedOpportunity.id}
                  >
                    {actionLoading === selectedOpportunity.id ? <Loader2 size={18} className="spinner" /> : <XCircle size={18} />}
                    <span>Закрыть вакансию</span>
                  </button>
                )}
                {selectedOpportunity.status === 'closed' && (
                  <button
                    className="company-modal__action-btn company-modal__action-btn--activate"
                    onClick={() => updateOpportunityStatus(selectedOpportunity.id, 'active')}
                    disabled={actionLoading === selectedOpportunity.id}
                  >
                    {actionLoading === selectedOpportunity.id ? <Loader2 size={18} className="spinner" /> : <CheckCircle size={18} />}
                    <span>Активировать</span>
                  </button>
                )}
                <button
                  className="company-modal__action-btn company-modal__action-btn--danger"
                  onClick={() => deleteOpportunity(selectedOpportunity.id)}
                  disabled={actionLoading === selectedOpportunity.id}
                >
                  {actionLoading === selectedOpportunity.id ? <Loader2 size={18} className="spinner" /> : <Trash2 size={18} />}
                  <span>Удалить</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Modal */}
      <AnimatePresence>
        {statsModalOpen && statsData && (
          <motion.div
            className="company-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setStatsModalOpen(false)}
          >
            <motion.div
              className="company-modal__content company-modal__content--medium"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="company-modal__close" onClick={() => setStatsModalOpen(false)}>
                <X size={20} />
              </button>
              <h3>Статистика вакансии</h3>
              <div className="company-stats__grid">
                <div className="company-stats__card">
                  <Eye size={24} />
                  <div className="company-stats__card-info">
                    <span className="company-stats__card-value">{statsData.views_count || 0}</span>
                    <span className="company-stats__card-label">Просмотров</span>
                  </div>
                </div>
                <div className="company-stats__card">
                  <Users size={24} />
                  <div className="company-stats__card-info">
                    <span className="company-stats__card-value">{statsData.applications_count || 0}</span>
                    <span className="company-stats__card-label">Откликов</span>
                  </div>
                </div>
                <div className="company-stats__card">
                  <CheckCircle size={24} />
                  <div className="company-stats__card-info">
                    <span className="company-stats__card-value">{statsData.accepted_count || 0}</span>
                    <span className="company-stats__card-label">Принято</span>
                  </div>
                </div>
                <div className="company-stats__card">
                  <Clock size={24} />
                  <div className="company-stats__card-info">
                    <span className="company-stats__card-value">{statsData.average_response_time || '—'}</span>
                    <span className="company-stats__card-label">Ср. время ответа</span>
                  </div>
                </div>
              </div>
              {statsData.applications_by_date && statsData.applications_by_date.length > 0 && (
                <div className="company-stats__chart">
                  <h4>Отклики по дням</h4>
                  <div className="company-stats__chart-bars">
                    {statsData.applications_by_date.map((item: any, i: number) => {
                      const height = Math.min(100, (item.count / maxChartValue) * 100);
                      return (
                        <div key={i} className="company-stats__chart-bar-wrapper">
                          <div 
                            className="company-stats__chart-bar" 
                            style={{ height: `${height}%` }}
                          />
                          <span className="company-stats__chart-label">{item.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Form Modal */}
      <AnimatePresence>
        {formModalOpen && (
          <OpportunityForm
            opportunity={editingOpportunity}
            onClose={() => {
              setFormModalOpen(false);
              setEditingOpportunity(null);
            }}
            onSuccess={() => {
              setFormModalOpen(false);
              setEditingOpportunity(null);
              fetchOpportunities();
              refreshStats();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default OpportunitiesPage;