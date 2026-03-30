// frontend/src/pages/adminDashboard/OpportunitiesPage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import {
  Search,
  Briefcase,
  Building2,
  MapPin,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  X,
  Loader2,
  Clock,
  MessageCircle,
  Filter,
  Trash2,
} from 'lucide-react';
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
  company: {
    id: number;
    name: string;
    display_name?: string;
    logo_url?: string;
  };
  tags: Array<{ id: number; name: string }>;
  views_count: number;
  applications_count: number;
  created_at: string;
  published_at?: string;
  expires_at?: string;
  event_date?: string;
}

interface AdminContext {
  user: any;
  refreshStats: () => void;
  stats: any;
}

const OpportunitiesPage = () => {
  const navigate = useNavigate();
  const { opportunityId } = useParams();
  const { refreshStats } = useOutletContext<AdminContext>();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

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
    filterOpportunities();
  }, [opportunities, searchQuery, typeFilter, statusFilter]);

  const fetchOpportunities = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      // Используем эндпоинт /api/curator/opportunities для получения всех возможностей
      // (этот эндпоинт должен быть доступен для кураторов и админов)
      const url = '/api/curator/opportunities?per_page=200';
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Обрабатываем как массив или как объект с items
        const items = Array.isArray(data) ? data : (data.items || []);
        setOpportunities(items);
        setFilteredOpportunities(items);
      } else {
        console.error('Failed to fetch opportunities:', response.status);
        // Fallback: пробуем получить через обычный эндпоинт с расширенными правами
        const fallbackResponse = await fetch('/api/opportunities?per_page=200', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          const items = data.items || [];
          // Фильтруем, чтобы получить все возможности (не только активные)
          setOpportunities(items);
          setFilteredOpportunities(items);
        }
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOpportunities = () => {
    let filtered = [...opportunities];
    
    // Фильтр по статусу модерации
    if (statusFilter === 'pending') {
      filtered = filtered.filter(opp => opp.moderation_status === 'pending');
    } else if (statusFilter === 'approved') {
      filtered = filtered.filter(opp => opp.moderation_status === 'approved');
    } else if (statusFilter === 'rejected') {
      filtered = filtered.filter(opp => opp.moderation_status === 'rejected');
    } else if (statusFilter === 'changes_requested') {
      filtered = filtered.filter(opp => opp.moderation_status === 'changes_requested');
    }
    
    // Поиск
    if (searchQuery) {
      filtered = filtered.filter(opp =>
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.company?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Фильтр по типу
    if (typeFilter) {
      filtered = filtered.filter(opp => opp.type === typeFilter);
    }
    
    setFilteredOpportunities(filtered);
  };

  const handleOpportunityClick = async (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setModalOpen(true);
    navigate(`/admin/opportunities/${opportunity.id}`, { replace: true });
  };

  const approveOpportunity = async (opportunityId: number) => {
    setActionLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/curator/opportunities/${opportunityId}/approve`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchOpportunities();
        refreshStats();
        setModalOpen(false);
        navigate('/admin/opportunities');
        alert('Возможность успешно одобрена');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при одобрении');
      }
    } catch (error) {
      console.error('Error approving opportunity:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(false);
    }
  };

  const rejectOpportunity = async (opportunityId: number, comment?: string) => {
    setActionLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/curator/opportunities/${opportunityId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment }),
      });

      if (response.ok) {
        await fetchOpportunities();
        refreshStats();
        setModalOpen(false);
        setShowRejectModal(false);
        navigate('/admin/opportunities');
        alert('Возможность отклонена');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при отклонении');
      }
    } catch (error) {
      console.error('Error rejecting opportunity:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(false);
    }
  };

  const requestChanges = async (opportunityId: number, comment: string) => {
    setActionLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/curator/opportunities/${opportunityId}/request-changes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment }),
      });

      if (response.ok) {
        await fetchOpportunities();
        refreshStats();
        setModalOpen(false);
        setShowRejectModal(false);
        navigate('/admin/opportunities');
        alert('Запрос на изменения отправлен');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при отправке запроса');
      }
    } catch (error) {
      console.error('Error requesting changes:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteOpportunity = async (opportunityId: number) => {
  if (!confirm('Вы уверены, что хотите удалить эту возможность? Все данные о ней (отклики, просмотры, избранное) будут безвозвратно удалены. Это действие нельзя отменить.')) return;
  
  setActionLoading(true);
  const token = localStorage.getItem('access_token');
  if (!token) return;

  try {
    // Используем правильный эндпоинт из спецификации: DELETE /api/opportunities/{opportunity_id}
    const response = await fetch(`/api/opportunities/${opportunityId}`, {
      method: 'DELETE',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });

    if (response.ok) {
      await fetchOpportunities();
      refreshStats();
      setModalOpen(false);
      navigate('/admin/opportunities');
      alert('Возможность успешно удалена');
    } else {
      const error = await response.json().catch(() => null);
      alert(error?.detail || 'Ошибка при удалении возможности');
    }
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    alert('Ошибка сети. Проверьте подключение.');
  } finally {
    setActionLoading(false);
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

  const getModerationStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'На модерации', color: '#ffcc33' };
      case 'approved': return { label: 'Одобрено', color: '#33ff66' };
      case 'rejected': return { label: 'Отклонено', color: '#ff3366' };
      case 'changes_requested': return { label: 'Требуются изменения', color: '#ff9933' };
      default: return { label: status, color: '#888' };
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
    { value: 'pending', label: 'На модерации' },
    { value: 'changes_requested', label: 'Требуют изменений' },
    { value: 'approved', label: 'Одобренные' },
    { value: 'rejected', label: 'Отклоненные' },
  ];

  const typeOptions = [
    { value: '', label: 'Все типы' },
    { value: 'internship', label: 'Стажировки' },
    { value: 'vacancy', label: 'Вакансии' },
    { value: 'mentorship', label: 'Менторство' },
    { value: 'event', label: 'Мероприятия' },
  ];

  const getStatusCount = (status: string) => {
    return opportunities.filter(o => o.moderation_status === status).length;
  };

  if (loading) {
    return (
      <div className="admin-opportunities__loading">
        <div className="spinner"></div>
        <p>Загрузка возможностей...</p>
      </div>
    );
  }

  return (
    <div className="admin-opportunities">
      <motion.div
        className="admin-opportunities__header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Модерация возможностей</h1>
        <p>Проверка и одобрение вакансий, стажировок, мероприятий и менторских программ</p>
      </motion.div>

      <div className="admin-opportunities__status-tabs">
        {statusOptions.map(option => (
          <button
            key={option.value}
            className={`admin-opportunities__status-tab ${statusFilter === option.value ? 'active' : ''}`}
            onClick={() => setStatusFilter(option.value)}
          >
            {option.label}
            {getStatusCount(option.value) > 0 && (
              <span className="admin-opportunities__tab-count">{getStatusCount(option.value)}</span>
            )}
          </button>
        ))}
      </div>

      <div className="admin-opportunities__toolbar">
        <div className="admin-opportunities__search">
          <Search size={20} />
          <input
            type="text"
            placeholder="Поиск по названию или компании..."
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
          className={`admin-opportunities__filter-toggle ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} />
          <span>Фильтры</span>
        </button>
      </div>

      {showFilters && (
        <motion.div 
          className="admin-opportunities__filters"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="admin-opportunities__filter-group">
            <label>Тип возможности</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {typeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      <div className="admin-opportunities__list">
        {filteredOpportunities.length === 0 ? (
          <div className="admin-opportunities__empty">
            <div className="admin-opportunities__empty-icon"><Briefcase size={48} /></div>
            <h3>Нет возможностей</h3>
            <p>Возможности не найдены</p>
          </div>
        ) : (
          filteredOpportunities.map((opp, index) => {
            const statusConfig = getModerationStatusLabel(opp.moderation_status);
            return (
              <motion.div
                key={opp.id}
                className="admin-opportunities__card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleOpportunityClick(opp)}
              >
                <div className="admin-opportunities__card-badges">
                  <span className={`admin-opportunities__type-badge admin-opportunities__type-badge--${opp.type}`}>
                    {getTypeLabel(opp.type)}
                  </span>
                  <span className="admin-opportunities__format-badge">
                    {getFormatLabel(opp.work_format)}
                  </span>
                  <span className="admin-opportunities__status-badge" style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}>
                    {statusConfig.label}
                  </span>
                </div>
                <h3 className="admin-opportunities__card-title">{opp.title}</h3>
                <div className="admin-opportunities__card-company">
                  {opp.company?.logo_url ? (
                    <img src={opp.company.logo_url} alt={opp.company.name} />
                  ) : (
                    <div className="admin-opportunities__card-company-placeholder">
                      {opp.company?.name?.[0] || '?'}
                    </div>
                  )}
                  <span>{opp.company?.display_name || opp.company?.name}</span>
                </div>
                <div className="admin-opportunities__card-meta">
                  <div className="admin-opportunities__card-meta-item">
                    <MapPin size={14} />
                    <span>{opp.city}</span>
                  </div>
                  {formatSalary(opp.salary_min, opp.salary_max) && (
                    <div className="admin-opportunities__card-meta-item admin-opportunities__card-salary">
                      {formatSalary(opp.salary_min, opp.salary_max)}
                    </div>
                  )}
                  <div className="admin-opportunities__card-meta-item">
                    <Calendar size={14} />
                    <span>{formatDate(opp.created_at)}</span>
                  </div>
                </div>
                {opp.tags && opp.tags.length > 0 && (
                  <div className="admin-opportunities__card-tags">
                    {opp.tags.slice(0, 3).map(tag => (
                      <span key={tag.id} className="admin-opportunities__card-tag">{tag.name}</span>
                    ))}
                  </div>
                )}
                <button className="admin-opportunities__card-btn">
                  Проверить <ChevronRight size={16} />
                </button>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Opportunity Detail Modal */}
      <AnimatePresence>
        {modalOpen && selectedOpportunity && (
          <motion.div
            className="admin-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setModalOpen(false);
              navigate('/admin/opportunities');
            }}
          >
            <motion.div
              className="admin-modal__content admin-modal__content--large"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="admin-modal__close" onClick={() => {
                setModalOpen(false);
                navigate('/admin/opportunities');
              }}>
                <X size={20} />
              </button>

              <div className="admin-modal__header">
                <div className="admin-modal__info">
                  <h2>{selectedOpportunity.title}</h2>
                  <div className="admin-modal__badges">
                    <span className={`admin-modal__type-badge admin-modal__type-badge--${selectedOpportunity.type}`}>
                      {getTypeLabel(selectedOpportunity.type)}
                    </span>
                    <span className="admin-modal__format-badge">
                      {getFormatLabel(selectedOpportunity.work_format)}
                    </span>
                    <span className="admin-modal__status-badge" style={{
                      backgroundColor: getModerationStatusLabel(selectedOpportunity.moderation_status).color + '20',
                      color: getModerationStatusLabel(selectedOpportunity.moderation_status).color
                    }}>
                      {getModerationStatusLabel(selectedOpportunity.moderation_status).label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="admin-modal__company">
                {selectedOpportunity.company?.logo_url ? (
                  <img src={selectedOpportunity.company.logo_url} alt={selectedOpportunity.company.name} />
                ) : (
                  <div className="admin-modal__company-placeholder">
                    {selectedOpportunity.company?.name?.[0] || '?'}
                  </div>
                )}
                <div>
                  <h3>{selectedOpportunity.company?.display_name || selectedOpportunity.company?.name}</h3>
                </div>
              </div>

              <div className="admin-modal__info-grid">
                <div className="admin-modal__info-item">
                  <MapPin size={16} />
                  <span>{selectedOpportunity.city}</span>
                </div>
                {selectedOpportunity.address && (
                  <div className="admin-modal__info-item">
                    <Building2 size={16} />
                    <span>{selectedOpportunity.address}</span>
                  </div>
                )}
                <div className="admin-modal__info-item">
                  <Briefcase size={16} />
                  <span>{formatSalary(selectedOpportunity.salary_min, selectedOpportunity.salary_max) || 'Зарплата не указана'}</span>
                </div>
                {selectedOpportunity.event_date && (
                  <div className="admin-modal__info-item">
                    <Calendar size={16} />
                    <span>Дата мероприятия: {formatDate(selectedOpportunity.event_date)}</span>
                  </div>
                )}
                {selectedOpportunity.expires_at && (
                  <div className="admin-modal__info-item">
                    <Clock size={16} />
                    <span>Действует до: {formatDate(selectedOpportunity.expires_at)}</span>
                  </div>
                )}
                <div className="admin-modal__info-item">
                  <Eye size={16} />
                  <span>{selectedOpportunity.views_count} просмотров</span>
                </div>
                <div className="admin-modal__info-item">
                  <MessageCircle size={16} />
                  <span>{selectedOpportunity.applications_count} откликов</span>
                </div>
              </div>

              <div className="admin-modal__description">
                <h4>Описание</h4>
                <p>{selectedOpportunity.description}</p>
              </div>

              {selectedOpportunity.tags && selectedOpportunity.tags.length > 0 && (
                <div className="admin-modal__tags">
                  <h4>Навыки и технологии</h4>
                  <div className="admin-modal__tags-list">
                    {selectedOpportunity.tags.map(tag => (
                      <span key={tag.id} className="admin-modal__tag">{tag.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedOpportunity.moderation_comment && (
                <div className="admin-modal__comment">
                  <h4>Комментарий модератора</h4>
                  <p>{selectedOpportunity.moderation_comment}</p>
                </div>
              )}

              <div className="admin-modal__actions">
                {selectedOpportunity.moderation_status === 'pending' && (
                  <>
                    <button
                      className="admin-modal__action-btn admin-modal__action-btn--approve"
                      onClick={() => approveOpportunity(selectedOpportunity.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 size={18} className="spinner" /> : <CheckCircle size={18} />}
                      <span>Одобрить</span>
                    </button>
                    <button
                      className="admin-modal__action-btn admin-modal__action-btn--changes"
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 size={18} className="spinner" /> : <AlertCircle size={18} />}
                      <span>Запросить изменения</span>
                    </button>
                    <button
                      className="admin-modal__action-btn admin-modal__action-btn--reject"
                      onClick={() => rejectOpportunity(selectedOpportunity.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 size={18} className="spinner" /> : <XCircle size={18} />}
                      <span>Отклонить</span>
                    </button>
                  </>
                )}
                
                {/* Кнопка удаления - всегда доступна для админа */}
                <button
                  className="admin-modal__action-btn admin-modal__action-btn--delete"
                  onClick={() => deleteOpportunity(selectedOpportunity.id)}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 size={18} className="spinner" /> : <Trash2 size={18} />}
                  <span>Удалить</span>
                </button>
                
                {selectedOpportunity.moderation_status === 'changes_requested' && (
                  <div className="admin-modal__info-message">
                    <AlertCircle size={18} />
                    <span>Запрошены изменения. Ожидается ответ от компании.</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request Changes Modal */}
      <AnimatePresence>
        {showRejectModal && selectedOpportunity && (
          <motion.div
            className="admin-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              className="admin-modal__content admin-modal__content--small"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <h3>Комментарий для работодателя</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Укажите, что нужно исправить в возможности..."
                rows={4}
              />
              <div className="admin-modal__actions">
                <button
                  className="admin-modal__action-btn admin-modal__action-btn--cancel"
                  onClick={() => setShowRejectModal(false)}
                >
                  Отмена
                </button>
                <button
                  className="admin-modal__action-btn admin-modal__action-btn--changes"
                  onClick={() => requestChanges(selectedOpportunity.id, rejectReason)}
                  disabled={actionLoading || !rejectReason.trim()}
                >
                  {actionLoading ? <Loader2 size={18} className="spinner" /> : 'Отправить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OpportunitiesPage;