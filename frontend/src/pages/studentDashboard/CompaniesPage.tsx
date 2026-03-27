// frontend/src/pages/studentDashboard/CompaniesPage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Building2, 
  MapPin, 
  Briefcase, 
  Star, 
  Users, 
  X, 
  ChevronRight,
  Mail,
  Phone,
  Globe,
  Calendar,
  Heart,
  Eye,
  ThumbsUp,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Company {
  id: number;
  name: string;
  display_name: string;
  short_name?: string;
  brand_name?: string;
  description?: string;
  industry?: string;
  city?: string;
  logo_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  employee_count?: number;
  founded_year?: number;
  rating?: number;
  reviews_count?: number;
  status: string;
}

interface Review {
  id: number;
  rating: number;
  title?: string;
  text?: string;
  pros?: string;
  cons?: string;
  is_anonymous: boolean;
  is_verified: boolean;
  helpful_count: number;
  company_response?: string;
  company_response_at?: string;
  created_at: string;
  author: {
    id: number;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  } | null;
  user_marked_helpful?: boolean;
}

interface Opportunity {
  id: number;
  title: string;
  type: 'internship' | 'vacancy' | 'mentorship' | 'event';
  work_format: 'office' | 'hybrid' | 'remote';
  salary_min?: number;
  salary_max?: number;
  city: string;
  published_at?: string;
}

interface RatingStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: Record<string, number>;
}

const CompaniesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyOpportunities, setCompanyOpportunities] = useState<Opportunity[]>([]);
  const [companyReviews, setCompanyReviews] = useState<Review[]>([]);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsSort, setReviewsSort] = useState<'created_at' | 'rating_high' | 'rating_low' | 'helpful'>('created_at');
  const [favoriteCompanies, setFavoriteCompanies] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchCompanies();
    fetchFavoriteCompanies();
  }, []);

  useEffect(() => {
    filterCompanies();
  }, [companies, searchQuery]);

  const fetchCompanies = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch('/companies?limit=50', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
        setFilteredCompanies(data);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoriteCompanies = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const response = await fetch('/api/favorites/companies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFavoriteCompanies(new Set(data.map((c: Company) => c.id)));
      }
    } catch (error) {
      console.error('Error fetching favorite companies:', error);
    }
  };

  const toggleFavoriteCompany = async (companyId: number) => {
    const token = localStorage.getItem('access_token');
    const isFavorite = favoriteCompanies.has(companyId);
    
    try {
      const url = `/api/favorites/company/${companyId}`;
      const method = isFavorite ? 'DELETE' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        setFavoriteCompanies(prev => {
          const newSet = new Set(prev);
          if (isFavorite) {
            newSet.delete(companyId);
          } else {
            newSet.add(companyId);
          }
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const filterCompanies = () => {
    let filtered = [...companies];
    
    if (searchQuery) {
      filtered = filtered.filter(company =>
        company.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.city?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredCompanies(filtered);
  };

  const fetchCompanyOpportunities = async (companyId: number) => {
    setOpportunitiesLoading(true);
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`/api/opportunities?company_id=${companyId}&per_page=10`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setCompanyOpportunities(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching company opportunities:', error);
    } finally {
      setOpportunitiesLoading(false);
    }
  };

  const fetchCompanyReviews = async (companyId: number, page: number = 1, sort: string = reviewsSort) => {
    setReviewsLoading(true);
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(
        `/api/reviews/companies/${companyId}?page=${page}&per_page=5&sort_by=${sort}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCompanyReviews(data.items || []);
        setReviewsTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching company reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchCompanyRatingStats = async (companyId: number) => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`/api/reviews/companies/${companyId}/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setRatingStats(data);
      }
    } catch (error) {
      console.error('Error fetching rating stats:', error);
    }
  };

  const handleMarkHelpful = async (reviewId: number, isHelpful: boolean) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('Войдите в аккаунт, чтобы оценивать отзывы');
      return;
    }
    
    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful?is_helpful=${isHelpful}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Обновляем отзыв в списке
        setCompanyReviews(prev => 
          prev.map(review => 
            review.id === reviewId 
              ? { 
                  ...review, 
                  helpful_count: data.helpful_count,
                  user_marked_helpful: isHelpful
                }
              : review
          )
        );
      }
    } catch (error) {
      console.error('Error marking review helpful:', error);
    }
  };

  const handleCompanyClick = async (company: Company) => {
    setSelectedCompany(company);
    setReviewsPage(1);
    setReviewsSort('created_at');
    await Promise.all([
      fetchCompanyOpportunities(company.id),
      fetchCompanyReviews(company.id, 1, 'created_at'),
      fetchCompanyRatingStats(company.id)
    ]);
    setModalOpen(true);
  };

  const handleSortChange = async (sort: 'created_at' | 'rating_high' | 'rating_low' | 'helpful') => {
    setReviewsSort(sort);
    setReviewsPage(1);
    if (selectedCompany) {
      await fetchCompanyReviews(selectedCompany.id, 1, sort);
    }
  };

  const loadMoreReviews = async () => {
    const nextPage = reviewsPage + 1;
    if (selectedCompany && nextPage * 5 <= reviewsTotal) {
      setReviewsPage(nextPage);
      const token = localStorage.getItem('access_token');
      try {
        const response = await fetch(
          `/api/reviews/companies/${selectedCompany.id}?page=${nextPage}&per_page=5&sort_by=${reviewsSort}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        if (response.ok) {
          const data = await response.json();
          setCompanyReviews(prev => [...prev, ...(data.items || [])]);
        }
      } catch (error) {
        console.error('Error loading more reviews:', error);
      }
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
    return `${Math.floor(days / 7)} нед. назад`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="company-modal__stars">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            size={14}
            fill={star <= rating ? '#ffcc33' : 'none'}
            stroke="#ffcc33"
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="companies-page__loading">
        <div className="spinner"></div>
        <p>Загрузка компаний...</p>
      </div>
    );
  }

  return (
    <div className="companies-page">
      <div className="companies-page__header">
        <h1>Компании-работодатели</h1>
        <p>Найдите компанию мечты и узнайте о всех доступных возможностях</p>
      </div>

      <div className="companies-page__search">
        <Search size={20} />
        <input
          type="text"
          placeholder="Поиск по названию, отрасли или городу..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')}>
            <X size={16} />
          </button>
        )}
      </div>

      {filteredCompanies.length === 0 ? (
        <div className="companies-page__empty">
          <div className="companies-page__empty-icon">🏢</div>
          <h3>Компании не найдены</h3>
          <p>Попробуйте изменить поисковый запрос</p>
        </div>
      ) : (
        <div className="companies-page__grid">
          {filteredCompanies.map((company, index) => (
            <motion.div
              key={company.id}
              className="companies-page__card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => handleCompanyClick(company)}
            >
              <button
                className={`companies-page__favorite-btn ${favoriteCompanies.has(company.id) ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavoriteCompany(company.id);
                }}
              >
                <Heart size={18} fill={favoriteCompanies.has(company.id) ? '#ff3366' : 'none'} />
              </button>
              
              <div className="companies-page__card-logo">
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.display_name} />
                ) : (
                  <div className="companies-page__card-logo-placeholder">
                    {company.display_name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
              
              <h3 className="companies-page__card-name">{company.display_name}</h3>
              
              <div className="companies-page__card-rating">
                <Star size={14} fill="#ffcc33" stroke="#ffcc33" />
                <span>{company.rating?.toFixed(1) || 'Новый'}</span>
                <span className="companies-page__card-reviews">
                  ({company.reviews_count || 0} отзывов)
                </span>
              </div>
              
              <div className="companies-page__card-info">
                {company.city && (
                  <div className="companies-page__card-info-item">
                    <MapPin size={14} />
                    <span>{company.city}</span>
                  </div>
                )}
                {company.industry && (
                  <div className="companies-page__card-info-item">
                    <Briefcase size={14} />
                    <span>{company.industry}</span>
                  </div>
                )}
                {company.employee_count && (
                  <div className="companies-page__card-info-item">
                    <Users size={14} />
                    <span>{company.employee_count}+ сотрудников</span>
                  </div>
                )}
              </div>
              
              {company.description && (
                <p className="companies-page__card-description">
                  {company.description.length > 100 
                    ? `${company.description.substring(0, 100)}...` 
                    : company.description}
                </p>
              )}
              
              <button className="companies-page__card-btn">
                Подробнее <ChevronRight size={16} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Company Detail Modal */}
      <AnimatePresence>
        {modalOpen && selectedCompany && (
          <motion.div
            className="company-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              className="company-modal__content"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="company-modal__close" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>

              <div className="company-modal__header">
                <div className="company-modal__logo">
                  {selectedCompany.logo_url ? (
                    <img src={selectedCompany.logo_url} alt={selectedCompany.display_name} />
                  ) : (
                    <div className="company-modal__logo-placeholder">
                      {selectedCompany.display_name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="company-modal__info">
                  <h2>{selectedCompany.display_name}</h2>
                  <div className="company-modal__rating">
                    <Star size={16} fill="#ffcc33" stroke="#ffcc33" />
                    <span>{selectedCompany.rating?.toFixed(1) || 'Новый'}</span>
                    <span className="company-modal__reviews-count">
                      ({selectedCompany.reviews_count || 0} отзывов)
                    </span>
                  </div>
                </div>
                <button
                  className={`company-modal__favorite ${favoriteCompanies.has(selectedCompany.id) ? 'active' : ''}`}
                  onClick={() => toggleFavoriteCompany(selectedCompany.id)}
                >
                  <Heart size={20} fill={favoriteCompanies.has(selectedCompany.id) ? '#ff3366' : 'none'} />
                  <span>
                    {favoriteCompanies.has(selectedCompany.id) ? 'В избранном' : 'В избранное'}
                  </span>
                </button>
              </div>

              <div className="company-modal__details">
                <div className="company-modal__detail-item">
                  <MapPin size={16} />
                  <span>{selectedCompany.city || 'Город не указан'}</span>
                </div>
                {selectedCompany.industry && (
                  <div className="company-modal__detail-item">
                    <Briefcase size={16} />
                    <span>{selectedCompany.industry}</span>
                  </div>
                )}
                {selectedCompany.founded_year && (
                  <div className="company-modal__detail-item">
                    <Calendar size={16} />
                    <span>Основана в {selectedCompany.founded_year} году</span>
                  </div>
                )}
                {selectedCompany.employee_count && (
                  <div className="company-modal__detail-item">
                    <Users size={16} />
                    <span>{selectedCompany.employee_count}+ сотрудников</span>
                  </div>
                )}
                {selectedCompany.website && (
                  <div className="company-modal__detail-item">
                    <Globe size={16} />
                    <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer">
                      {selectedCompany.website}
                    </a>
                  </div>
                )}
                {selectedCompany.email && (
                  <div className="company-modal__detail-item">
                    <Mail size={16} />
                    <a href={`mailto:${selectedCompany.email}`}>{selectedCompany.email}</a>
                  </div>
                )}
                {selectedCompany.phone && (
                  <div className="company-modal__detail-item">
                    <Phone size={16} />
                    <a href={`tel:${selectedCompany.phone}`}>{selectedCompany.phone}</a>
                  </div>
                )}
              </div>

              {selectedCompany.description && (
                <div className="company-modal__description">
                  <h3>О компании</h3>
                  <p>{selectedCompany.description}</p>
                </div>
              )}

              {/* Отзывы компании */}
              <div className="company-modal__reviews">
                <div className="company-modal__reviews-header">
                  <h3>
                    <MessageSquare size={18} />
                    Отзывы ({reviewsTotal})
                  </h3>
                  <div className="company-modal__reviews-sort">
                    <select 
                      value={reviewsSort} 
                      onChange={(e) => handleSortChange(e.target.value as any)}
                    >
                      <option value="created_at">Сначала новые</option>
                      <option value="rating_high">Сначала высокие</option>
                      <option value="rating_low">Сначала низкие</option>
                      <option value="helpful">Самые полезные</option>
                    </select>
                  </div>
                </div>

                {/* Статистика рейтинга */}
                {ratingStats && ratingStats.total_reviews > 0 && (
                  <div className="company-modal__rating-stats">
                    <div className="company-modal__rating-stats-average">
                      <div className="company-modal__rating-stats-number">
                        {ratingStats.average_rating.toFixed(1)}
                      </div>
                      <div className="company-modal__rating-stats-stars">
                        {renderStars(Math.round(ratingStats.average_rating))}
                      </div>
                      <div className="company-modal__rating-stats-count">
                        {ratingStats.total_reviews} отзывов
                      </div>
                    </div>
                    <div className="company-modal__rating-stats-distribution">
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = ratingStats.rating_distribution[star] || 0;
                        const percentage = ratingStats.total_reviews > 0 
                          ? (count / ratingStats.total_reviews) * 100 
                          : 0;
                        return (
                          <div key={star} className="company-modal__rating-stats-bar">
                            <span className="company-modal__rating-stats-bar-label">{star} ★</span>
                            <div className="company-modal__rating-stats-bar-track">
                              <div 
                                className="company-modal__rating-stats-bar-fill"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="company-modal__rating-stats-bar-count">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {reviewsLoading && reviewsPage === 1 ? (
                  <div className="company-modal__reviews-loading">
                    <div className="spinner-small"></div>
                    <span>Загрузка отзывов...</span>
                  </div>
                ) : companyReviews.length === 0 ? (
                  <div className="company-modal__reviews-empty">
                    <AlertCircle size={32} />
                    <p>Нет отзывов о компании</p>
                    <button 
                      className="company-modal__write-review"
                      onClick={() => {
                        setModalOpen(false);
                        navigate(`/student/companies/${selectedCompany.id}/review`);
                      }}
                    >
                      Написать отзыв
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="company-modal__reviews-list">
                      {companyReviews.map(review => (
                        <div key={review.id} className="company-modal__review-card">
                          <div className="company-modal__review-header">
                            <div className="company-modal__review-author">
                              <div className="company-modal__review-avatar">
                                {review.author?.avatar_url ? (
                                  <img src={review.author.avatar_url} alt="" />
                                ) : (
                                  <div className="company-modal__review-avatar-placeholder">
                                    {review.author?.first_name?.charAt(0) || 'А'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="company-modal__review-name">
                                  {review.is_anonymous 
                                    ? 'Анонимный пользователь' 
                                    : `${review.author?.first_name || ''} ${review.author?.last_name || ''}`.trim() || 'Пользователь'}
                                </div>
                                <div className="company-modal__review-date">
                                  <Calendar size={12} />
                                  {formatDate(review.created_at)}
                                </div>
                              </div>
                            </div>
                            <div className="company-modal__review-rating">
                              {renderStars(review.rating)}
                              <span className="company-modal__review-rating-value">{review.rating}/5</span>
                            </div>
                          </div>
                          
                          {review.title && (
                            <h4 className="company-modal__review-title">{review.title}</h4>
                          )}
                          
                          {review.text && (
                            <p className="company-modal__review-text">{review.text}</p>
                          )}
                          
                          {(review.pros || review.cons) && (
                            <div className="company-modal__review-pros-cons">
                              {review.pros && (
                                <div className="company-modal__review-pros">
                                  <strong>Плюсы:</strong> {review.pros}
                                </div>
                              )}
                              {review.cons && (
                                <div className="company-modal__review-cons">
                                  <strong>Минусы:</strong> {review.cons}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {review.company_response && (
                            <div className="company-modal__review-response">
                              <div className="company-modal__review-response-icon">
                                <Building2 size={14} />
                              </div>
                              <div className="company-modal__review-response-content">
                                <strong>Ответ компании:</strong>
                                <p>{review.company_response}</p>
                                {review.company_response_at && (
                                  <span className="company-modal__review-response-date">
                                    {formatDate(review.company_response_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <button
                            className={`company-modal__review-helpful ${review.user_marked_helpful ? 'active' : ''}`}
                            onClick={() => handleMarkHelpful(review.id, !review.user_marked_helpful)}
                          >
                            <ThumbsUp size={14} />
                            <span>Полезно ({review.helpful_count})</span>
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {companyReviews.length < reviewsTotal && (
                      <button
                        className="company-modal__load-more"
                        onClick={loadMoreReviews}
                        disabled={reviewsLoading}
                      >
                        {reviewsLoading ? 'Загрузка...' : 'Показать еще отзывы'}
                      </button>
                    )}
                    
                    <button 
                      className="company-modal__write-review"
                      onClick={() => {
                        setModalOpen(false);
                        navigate(`/student/companies/${selectedCompany.id}/review`);
                      }}
                    >
                      Написать отзыв
                    </button>
                  </>
                )}
              </div>

              {/* Актуальные возможности */}
              <div className="company-modal__opportunities">
                <h3>Актуальные возможности</h3>
                {opportunitiesLoading ? (
                  <div className="company-modal__loading">
                    <div className="spinner-small"></div>
                    <span>Загрузка вакансий...</span>
                  </div>
                ) : companyOpportunities.length === 0 ? (
                  <div className="company-modal__no-opportunities">
                    <p>Нет активных вакансий в данный момент</p>
                  </div>
                ) : (
                  <div className="company-modal__opportunities-list">
                    {companyOpportunities.map(opp => (
                      <div
                        key={opp.id}
                        className="company-modal__opportunity-card"
                        onClick={() => {
                          setModalOpen(false);
                          navigate(`/student/opportunities/${opp.id}`);
                        }}
                      >
                        <div className="company-modal__opportunity-header">
                          <span className={`company-modal__opportunity-type company-modal__opportunity-type--${opp.type}`}>
                            {getTypeLabel(opp.type)}
                          </span>
                          <span className="company-modal__opportunity-format">
                            {getFormatLabel(opp.work_format)}
                          </span>
                        </div>
                        <h4 className="company-modal__opportunity-title">{opp.title}</h4>
                        <div className="company-modal__opportunity-meta">
                          <div className="company-modal__opportunity-meta-item">
                            <MapPin size={14} />
                            <span>{opp.city}</span>
                          </div>
                          {formatSalary(opp.salary_min, opp.salary_max) && (
                            <div className="company-modal__opportunity-salary">
                              {formatSalary(opp.salary_min, opp.salary_max)}
                            </div>
                          )}
                          <div className="company-modal__opportunity-meta-item">
                            <Calendar size={14} />
                            <span>{timeAgo(opp.published_at)}</span>
                          </div>
                        </div>
                        <button className="company-modal__opportunity-btn">
                          Подробнее <ChevronRight size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompaniesPage;