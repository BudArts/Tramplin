// frontend/src/components/OpportunityDetailModal.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Calendar, Clock, Building2, Tag, Eye, Phone, Mail, Globe, Briefcase } from 'lucide-react';
import type { OpportunityResponse } from '../api/types';

interface Props {
  opportunity: OpportunityResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

const OpportunityDetailModal: React.FC<Props> = ({ opportunity, isOpen, onClose }) => {
  if (!opportunity) return null;

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="opportunity-modal__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="opportunity-modal__content"
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
          >
            <button className="opportunity-modal__close" onClick={onClose}>
              <X size={20} />
            </button>

            <div className="opportunity-modal__header">
              <div className="opportunity-modal__badges">
                <span className={`opportunity-modal__badge opportunity-modal__badge--${opportunity.type}`}>
                  {getTypeLabel(opportunity.type)}
                </span>
                <span className="opportunity-modal__badge opportunity-modal__badge--format">
                  {getFormatLabel(opportunity.work_format)}
                </span>
              </div>
              <h2 className="opportunity-modal__title">{opportunity.title}</h2>
            </div>

            <div className="opportunity-modal__company">
              {opportunity.company?.logo_url ? (
                <img src={opportunity.company.logo_url} alt={opportunity.company.name || ''} />
              ) : (
                <div className="opportunity-modal__company-placeholder">
                  {opportunity.company?.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div>
                <h3>{opportunity.company?.name || 'Компания'}</h3>
                {opportunity.company?.industry && (
                  <p>{opportunity.company.industry}</p>
                )}
              </div>
            </div>

            <div className="opportunity-modal__info-grid">
              <div className="opportunity-modal__info-item">
                <MapPin size={16} />
                <span>{opportunity.city || 'Не указан'}</span>
              </div>
              {opportunity.address && (
                <div className="opportunity-modal__info-item">
                  <Building2 size={16} />
                  <span>{opportunity.address}</span>
                </div>
              )}
              <div className="opportunity-modal__info-item">
                <Briefcase size={16} />
                <span className="opportunity-modal__salary">
                  {formatSalary(opportunity.salary_min, opportunity.salary_max)}
                </span>
              </div>
              {opportunity.event_date && (
                <div className="opportunity-modal__info-item">
                  <Calendar size={16} />
                  <span>Дата мероприятия: {formatDate(opportunity.event_date)}</span>
                </div>
              )}
              {opportunity.expires_at && (
                <div className="opportunity-modal__info-item">
                  <Clock size={16} />
                  <span>Действует до: {formatDate(opportunity.expires_at)}</span>
                </div>
              )}
              <div className="opportunity-modal__info-item">
                <Eye size={16} />
                <span>{opportunity.views_count || 0} просмотров</span>
              </div>
            </div>

            <div className="opportunity-modal__description">
              <h4>Описание</h4>
              <p>{opportunity.description}</p>
            </div>

            {opportunity.tags && opportunity.tags.length > 0 && (
              <div className="opportunity-modal__tags">
                <h4>Навыки и технологии</h4>
                <div className="opportunity-modal__tags-list">
                  {opportunity.tags.map(tag => (
                    <span key={tag.id} className="opportunity-modal__tag">{tag.name}</span>
                  ))}
                </div>
              </div>
            )}

            {(opportunity.contact_email || opportunity.contact_phone || opportunity.external_url) && (
              <div className="opportunity-modal__contacts">
                <h4>Контакты</h4>
                <div className="opportunity-modal__contacts-list">
                  {opportunity.contact_email && (
                    <a href={`mailto:${opportunity.contact_email}`} className="opportunity-modal__contact">
                      <Mail size={16} />
                      <span>{opportunity.contact_email}</span>
                    </a>
                  )}
                  {opportunity.contact_phone && (
                    <a href={`tel:${opportunity.contact_phone}`} className="opportunity-modal__contact">
                      <Phone size={16} />
                      <span>{opportunity.contact_phone}</span>
                    </a>
                  )}
                  {opportunity.external_url && (
                    <a href={opportunity.external_url} target="_blank" rel="noopener noreferrer" className="opportunity-modal__contact">
                      <Globe size={16} />
                      <span>Внешний ресурс</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="opportunity-modal__actions">
              <button className="opportunity-modal__apply-btn">
                Откликнуться
              </button>
              <button className="opportunity-modal__save-btn">
                Сохранить
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OpportunityDetailModal;