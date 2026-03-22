import { memo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Eye } from 'lucide-react';
import type { OpportunityResponse, OpportunityType, WorkFormat } from '../api/types';

interface Props {
  opportunity: OpportunityResponse;
  index: number;
}

const TYPE_LABELS: Record<OpportunityType, string> = {
  internship: 'Стажировка',
  vacancy: 'Вакансия',
  mentorship: 'Менторство',
  event: 'Мероприятие',
};

const FORMAT_LABELS: Record<WorkFormat, string> = {
  office: 'Офис',
  hybrid: 'Гибрид',
  remote: 'Удалённо',
};

function formatSalary(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => {
    if (n >= 1000) return `${Math.round(n / 1000)}к`;
    return String(n);
  };
  if (min && max) return `${fmt(min)} – ${fmt(max)} ₽`;
  if (min) return `от ${fmt(min)} ₽`;
  return `до ${fmt(max!)} ₽`;
}

function timeAgo(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн. назад`;
  if (days < 30) return `${Math.floor(days / 7)} нед. назад`;
  return `${Math.floor(days / 30)} мес. назад`;
}

const OpportunityCard: React.FC<Props> = memo(({ opportunity, index }) => {
  const salary = formatSalary(opportunity.salary_min, opportunity.salary_max);
  const published = timeAgo(opportunity.published_at);

  return (
    <motion.div
      className="opp-card"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.5, delay: (index % 6) * 0.08 }}
    >
      <div className={`opp-card__type-bar opp-card__type-bar--${opportunity.type}`} />

      <div className="opp-card__body">
        <div className="opp-card__top">
          <div className="opp-card__badges">
            <span className={`opp-card__badge opp-card__badge--type opp-card__badge--${opportunity.type}`}>
              {TYPE_LABELS[opportunity.type]}
            </span>
            <span className="opp-card__badge opp-card__badge--format">
              {FORMAT_LABELS[opportunity.work_format]}
            </span>
          </div>
        </div>

        <h3 className="opp-card__title">{opportunity.title}</h3>

        {opportunity.company && (
          <div className="opp-card__company">
            {opportunity.company.logo_url ? (
              <img
                className="opp-card__company-logo"
                src={opportunity.company.logo_url}
                alt={opportunity.company.name}
              />
            ) : (
              <div className="opp-card__company-logo opp-card__company-logo--placeholder">
                {opportunity.company.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <span className="opp-card__company-name">{opportunity.company.name}</span>
          </div>
        )}

        <div className="opp-card__meta">
          {opportunity.city && (
            <div className="opp-card__meta-item">
              <MapPin size={14} />
              {opportunity.city}
            </div>
          )}
          {published && (
            <div className="opp-card__meta-item">
              <Clock size={14} />
              {published}
            </div>
          )}
          {opportunity.views_count > 0 && (
            <div className="opp-card__meta-item">
              <Eye size={14} />
              {opportunity.views_count}
            </div>
          )}
        </div>

        {salary && <div className="opp-card__salary">{salary}</div>}

        {opportunity.tags && opportunity.tags.length > 0 && (
          <div className="opp-card__tags">
            {opportunity.tags.slice(0, 5).map(tag => (
              <span key={tag.id} className="opp-card__tag">{tag.name}</span>
            ))}
            {opportunity.tags.length > 5 && (
              <span className="opp-card__tag opp-card__tag--more">
                +{opportunity.tags.length - 5}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

OpportunityCard.displayName = 'OpportunityCard';

export default OpportunityCard;