// frontend/src/pages/studentDashboard/OpportunityDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Clock, Building2, Eye, Mail, Phone, Globe, Briefcase, Heart, Send, Users, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Opportunity {
  id: number;
  title: string;
  description: string;
  type: string;
  work_format: string;
  salary_min?: number;
  salary_max?: number;
  city: string;
  address?: string;
  company: {
    id: number;
    name: string;
    logo_url?: string;
    industry?: string;
  } | null;
  tags: Array<{ id: number; name: string }>;
  views_count: number;
  created_at: string;
  published_at?: string;
  expires_at?: string;
  event_date?: string;
  contact_email?: string;
  contact_phone?: string;
  external_url?: string;
}

const OpportunityDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Функция для сохранения просмотренной возможности
  const saveViewedOpportunity = (opportunityId: number) => {
    const viewed = localStorage.getItem('viewed_opportunities');
    const viewedIds = viewed ? new Set(JSON.parse(viewed)) : new Set();
    viewedIds.add(opportunityId);
    localStorage.setItem('viewed_opportunities', JSON.stringify(Array.from(viewedIds)));
    
    // Диспатчим событие для обновления счетчика на других страницах
    window.dispatchEvent(new Event('viewedOpportunitiesUpdated'));
  };

  useEffect(() => {
    fetchOpportunity();
    checkFavorite();
  }, [id]);

  const fetchOpportunity = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`/api/opportunities/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setOpportunity(data);
        
        // Увеличиваем счетчик просмотров
        await incrementViewCount(data.id);
        
        // Сохраняем в localStorage, что пользователь просмотрел эту возможность
        saveViewedOpportunity(data.id);
      }
    } catch (error) {
      console.error('Error fetching opportunity:', error);
    } finally {
      setLoading(false);
    }
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

  const checkFavorite = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const response = await fetch('/api/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setIsFavorite(data.some((item: any) => item.id === parseInt(id!)));
      }
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const toggleFavorite = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('Войдите в аккаунт, чтобы добавлять в избранное');
      return;
    }
    
    try {
      const url = `/api/favorites/opportunity/${id}`;
      const method = isFavorite ? 'DELETE' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setIsFavorite(!isFavorite);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ opportunity_id: parseInt(id!) }),
      });
      if (response.ok) {
        alert('Отклик успешно отправлен!');
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

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Не указано';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
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

  const formatSalary = (min?: number | null, max?: number | null) => {
    if (!min && !max) return 'Не указана';
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()} ₽`;
    if (min) return `от ${min.toLocaleString()} ₽`;
    if (max) return `до ${max.toLocaleString()} ₽`;
    return 'Не указана';
  };

  if (loading) {
    return (
      <div className="opportunity-detail__loading">
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="opportunity-detail__not-found">
        <h2>Вакансия не найдена</h2>
        <button onClick={() => navigate('/student/opportunities')}>Вернуться к списку</button>
      </div>
    );
  }

  return (
    <div className="opportunity-detail">
      <div className="container">
        <button className="opportunity-detail__back" onClick={() => navigate('/student/opportunities')}>
          <ArrowLeft size={20} />
          <span>Назад к списку</span>
        </button>

        <motion.div
          className="opportunity-detail__content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="opportunity-detail__header">
            <div className="opportunity-detail__badges">
              <span className={`opportunity-detail__badge opportunity-detail__badge--${opportunity.type}`}>
                {getTypeLabel(opportunity.type)}
              </span>
              <span className="opportunity-detail__badge opportunity-detail__badge--format">
                {getFormatLabel(opportunity.work_format)}
              </span>
            </div>
            <button 
              className={`opportunity-detail__favorite ${isFavorite ? 'active' : ''}`}
              onClick={toggleFavorite}
            >
              <Heart size={20} fill={isFavorite ? '#ff3366' : 'none'} />
            </button>
            <h1>{opportunity.title}</h1>
          </div>

          <div className="opportunity-detail__company">
            {opportunity.company?.logo_url ? (
              <img src={opportunity.company.logo_url} alt={opportunity.company.name} />
            ) : (
              <div className="opportunity-detail__company-placeholder">
                {opportunity.company?.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div>
              <h2>{opportunity.company?.name || 'Компания'}</h2>
              {opportunity.company?.industry && <p>{opportunity.company.industry}</p>}
            </div>
          </div>

          <div className="opportunity-detail__info-grid">
            <div className="opportunity-detail__info-item">
              <MapPin size={16} />
              <span>{opportunity.city || 'Не указан'}</span>
            </div>
            {opportunity.address && (
              <div className="opportunity-detail__info-item">
                <Building2 size={16} />
                <span>{opportunity.address}</span>
              </div>
            )}
            <div className="opportunity-detail__info-item">
              <Briefcase size={16} />
              <span>{formatSalary(opportunity.salary_min, opportunity.salary_max)}</span>
            </div>
            {opportunity.event_date && (
              <div className="opportunity-detail__info-item">
                <Calendar size={16} />
                <span>Дата мероприятия: {formatDate(opportunity.event_date)}</span>
              </div>
            )}
            {opportunity.expires_at && (
              <div className="opportunity-detail__info-item">
                <Clock size={16} />
                <span>Действует до: {formatDate(opportunity.expires_at)}</span>
              </div>
            )}
            <div className="opportunity-detail__info-item">
              <Eye size={16} />
              <span>{opportunity.views_count || 0} просмотров</span>
            </div>
          </div>

          <div className="opportunity-detail__description">
            <h3>Описание</h3>
            <p>{opportunity.description}</p>
          </div>

          {opportunity.tags && opportunity.tags.length > 0 && (
            <div className="opportunity-detail__tags">
              <h3>Навыки и технологии</h3>
              <div className="opportunity-detail__tags-list">
                {opportunity.tags.map(tag => (
                  <span key={tag.id} className="opportunity-detail__tag">{tag.name}</span>
                ))}
              </div>
            </div>
          )}

          {(opportunity.contact_email || opportunity.contact_phone || opportunity.external_url) && (
            <div className="opportunity-detail__contacts">
              <h3>Контакты</h3>
              <div className="opportunity-detail__contacts-list">
                {opportunity.contact_email && (
                  <a href={`mailto:${opportunity.contact_email}`} className="opportunity-detail__contact">
                    <Mail size={16} />
                    <span>{opportunity.contact_email}</span>
                  </a>
                )}
                {opportunity.contact_phone && (
                  <a href={`tel:${opportunity.contact_phone}`} className="opportunity-detail__contact">
                    <Phone size={16} />
                    <span>{opportunity.contact_phone}</span>
                  </a>
                )}
                {opportunity.external_url && (
                  <a href={opportunity.external_url} target="_blank" rel="noopener noreferrer" className="opportunity-detail__contact">
                    <Globe size={16} />
                    <span>Внешний ресурс</span>
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="opportunity-detail__actions">
            <button 
              className="opportunity-detail__apply-btn" 
              onClick={handleApply}
              disabled={applying}
            >
              {applying ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  <span>Отправка...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Откликнуться</span>
                </>
              )}
            </button>
            <button 
              className="opportunity-detail__recommend-btn"
              onClick={() => navigate(`/student/recommend-opportunity?opportunityId=${opportunity.id}`)}
            >
              <Users size={18} />
              <span>Рекомендовать другу</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OpportunityDetailPage;