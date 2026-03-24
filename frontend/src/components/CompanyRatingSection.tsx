import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, MapPin, Briefcase, ExternalLink } from 'lucide-react';
import { api } from '../api/client';

interface Company {
  id: number;
  inn: string;
  name: string;
  short_name: string | null;
  brand_name: string | null;
  display_name: string;
  industry: string | null;
  city: string | null;
  status: string;
  logo_url: string | null;
}

interface CompanyRatingStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: Record<string, number>;
}

interface Review {
  id: number;
  rating: number;
  title: string | null;
  text: string | null;
  pros: string | null;
  cons: string | null;
  is_anonymous: boolean;
  created_at: string;
  author: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

const CompanyRatingCard: React.FC<{ company: Company; index: number }> = ({ company, index }) => {
  const [ratingStats, setRatingStats] = useState<CompanyRatingStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        // Загружаем статистику рейтинга
        const statsResponse = await fetch(
          `http://localhost:8000/api/reviews/companies/${company.id}/stats`
        );
        
        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          setRatingStats(stats);
        } else {
          // Если нет отзывов, используем демо-данные
          setRatingStats({
            average_rating: 4.5,
            total_reviews: 0,
            rating_distribution: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 }
          });
        }

        // Загружаем последние отзывы
        const reviewsResponse = await fetch(
          `http://localhost:8000/api/reviews/companies/${company.id}?per_page=1&sort_by=created_at`
        );
        
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          setReviews(reviewsData.items || []);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных компании:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [company.id]);

  const rating = ratingStats?.average_rating || 0;
  const reviewsCount = ratingStats?.total_reviews || 0;
  
  // Получаем последний отзыв для предпросмотра
  const latestReview = reviews[0];
  const reviewText = latestReview?.text || latestReview?.pros || 
    (reviewsCount > 0 ? 'Отличная компания!' : 'Пока нет отзывов');

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
            alt={company.display_name} 
            className="company-rating-card__logo"
          />
        ) : (
          <div className="company-rating-card__logo company-rating-card__logo--placeholder">
            {company.display_name?.charAt(0)?.toUpperCase()}
          </div>
        )}
        
        <div className="company-rating-card__rating">
          <Star size={16} fill="#ffcc33" stroke="#ffcc33" />
          <span className="company-rating-card__rating-value">
            {loading ? '--' : rating.toFixed(1)}
          </span>
          <span className="company-rating-card__rating-count">
            ({loading ? '--' : reviewsCount})
          </span>
        </div>
      </div>
      
      <h3 className="company-rating-card__name">{company.display_name}</h3>
      
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
      
      <div className="company-rating-card__reviews">
        {!loading && reviewsCount > 0 ? (
          <div className="company-rating-card__review-preview">
            <p>“{reviewText.length > 120 ? reviewText.substring(0, 120) + '...' : reviewText}”</p>
            <span>
              — {latestReview?.is_anonymous ? 'Анонимный отзыв' : 
                 latestReview?.author ? `${latestReview.author.first_name} ${latestReview.author.last_name}` : 'Пользователь'}
            </span>
          </div>
        ) : !loading && (
          <div className="company-rating-card__review-preview">
            <p>Будьте первым, кто оставит отзыв о компании!</p>
            <span>Поделитесь своим опытом</span>
          </div>
        )}
        {loading && (
          <div className="company-rating-card__review-preview">
            <p>Загрузка отзывов...</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const CompanyRatingSection = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        // Получаем список активных компаний
        const response = await fetch('http://localhost:8000/companies/?skip=0&limit=20');
        const data = await response.json();
        
        if (data && data.length > 0) {
          // Фильтруем только активные компании и берем первые 3
          const activeCompanies = data
            .filter((c: Company) => c.status === 'active')
            .slice(0, 3);
          setCompanies(activeCompanies);
        }
      } catch (error) {
        console.error('Ошибка загрузки компаний:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  return (
    <section className="company-rating-section" id="companies-section">
      <motion.div
        className="company-rating-section__header"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        <div className="company-rating-section__title-wrapper">
          <Trophy size={32} className="company-rating-section__trophy" />
          <h2 className="company-rating-section__title">
            ЛУЧШИЕ <span>РАБОТОДАТЕЛИ</span>
          </h2>
        </div>
        <p className="company-rating-section__subtitle">
          Компании с самым высоким рейтингом по версии наших пользователей
        </p>
      </motion.div>

      <div className="container">
        {loading ? (
          <div className="company-rating-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="loading-card company-loading-card" />
            ))}
          </div>
        ) : companies.length > 0 ? (
          <div className="company-rating-grid">
            {companies.map((company, index) => (
              <CompanyRatingCard key={company.id} company={company} index={index} />
            ))}
          </div>
        ) : (
          <div className="company-rating-empty">
            <p>Компании пока не зарегистрированы</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CompanyRatingSection;