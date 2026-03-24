import { motion } from 'framer-motion';
import { Star, MapPin, Briefcase, Users } from 'lucide-react';
import type { CompanyResponse } from '../api/types';

interface CompanyRatingCardProps {
  company: CompanyResponse & { rating?: number; reviews_count?: number };
  index: number;
}

const CompanyRatingCard: React.FC<CompanyRatingCardProps> = ({ company, index }) => {
  const rating = company.rating || 4.5;
  const reviewsCount = company.reviews_count || 0;
  
  return (
    <motion.div
      className="company-rating-card"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
    >
      <div className="company-rating-card__top">
        {company.logo_url ? (
          <img 
            src={company.logo_url} 
            alt={company.name} 
            className="company-rating-card__logo"
          />
        ) : (
          <div className="company-rating-card__logo company-rating-card__logo--placeholder">
            {company.name?.charAt(0)?.toUpperCase()}
          </div>
        )}
        
        <div className="company-rating-card__rating">
          <Star size={16} fill="#ffcc33" stroke="#ffcc33" />
          <span className="company-rating-card__rating-value">{rating.toFixed(1)}</span>
          <span className="company-rating-card__rating-count">({reviewsCount})</span>
        </div>
      </div>
      
      <h3 className="company-rating-card__name">{company.name}</h3>
      
      <div className="company-rating-card__info">
        {company.city && (
          <div className="company-rating-card__info-item">
            <MapPin size={14} />
            <span>{company.city}</span>
          </div>
        )}
        {company.industry && (
          <div className="company-rating-card__info-item">
            <Briefcase size={14} />
            <span>{company.industry}</span>
          </div>
        )}
      </div>
      
      <div className="company-rating-card__stats">
        <div className="company-rating-card__stat">
          <Users size={14} />
          <span>~50+ сотрудников</span>
        </div>
      </div>
      
      <div className="company-rating-card__reviews">
        {reviewsCount > 0 && (
          <div className="company-rating-card__review-preview">
            <p>“Отличная компания для старта карьеры!”</p>
            <span>— Анонимный отзыв</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CompanyRatingCard;