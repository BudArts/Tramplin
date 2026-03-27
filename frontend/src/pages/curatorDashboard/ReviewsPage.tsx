// frontend/src/pages/curatorDashboard/ReviewsPage.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  MessageSquare,
  Star,
  Building2,
  User,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  X,
  Loader2,
  ChevronRight,
  ThumbsUp,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Review {
  id: number;
  rating: number;
  title?: string;
  text?: string;
  pros?: string;
  cons?: string;
  is_anonymous: boolean;
  is_verified: boolean;
  is_hidden: boolean;
  helpful_count: number;
  company_response?: string;
  company_response_at?: string;
  created_at: string;
  updated_at: string;
  author: {
    id: number;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  } | null;
  company: {
    id: number;
    name: string;
    display_name?: string;
    logo_url?: string;
  };
}

interface CuratorContext {
  user: any;
  refreshStats: () => void;
  stats: any;
}

const ReviewsPage = () => {
  const navigate = useNavigate();
  const { refreshStats } = useOutletContext<CuratorContext>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    filterReviews();
  }, [reviews, searchQuery, statusFilter]);

  const fetchReviews = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/reviews?per_page=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setReviews(data.items || []);
        setFilteredReviews(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReviews = () => {
    let filtered = [...reviews];
    
    if (searchQuery) {
      filtered = filtered.filter(review =>
        review.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.company?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (statusFilter === 'flagged') {
      filtered = filtered.filter(review => review.is_hidden);
    } else if (statusFilter === 'verified') {
      filtered = filtered.filter(review => review.is_verified);
    } else if (statusFilter === 'pending') {
      filtered = filtered.filter(review => !review.is_verified && !review.is_hidden);
    }
    
    setFilteredReviews(filtered);
  };

  const hideReview = async (reviewId: number) => {
    setActionLoading(reviewId);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/curator/reviews/${reviewId}/hide`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchReviews();
        refreshStats();
        alert('Отзыв скрыт');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при скрытии отзыва');
      }
    } catch (error) {
      console.error('Error hiding review:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(null);
    }
  };

  const restoreReview = async (reviewId: number) => {
    setActionLoading(reviewId);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/curator/reviews/${reviewId}/restore`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchReviews();
        refreshStats();
        alert('Отзыв восстановлен');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при восстановлении отзыва');
      }
    } catch (error) {
      console.error('Error restoring review:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(null);
    }
  };

  const verifyReview = async (reviewId: number) => {
    setActionLoading(reviewId);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/curator/reviews/${reviewId}/verify`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchReviews();
        refreshStats();
        alert('Отзыв подтвержден');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при подтверждении отзыва');
      }
    } catch (error) {
      console.error('Error verifying review:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="curator-reviews__stars">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            size={12}
            fill={star <= rating ? '#ffcc33' : 'none'}
            stroke="#ffcc33"
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const statusOptions = [
    { value: 'all', label: 'Все отзывы' },
    { value: 'pending', label: 'На проверке' },
    { value: 'verified', label: 'Подтвержденные' },
    { value: 'flagged', label: 'Скрытые' },
  ];

  if (loading) {
    return (
      <div className="curator-reviews__loading">
        <div className="spinner"></div>
        <p>Загрузка отзывов...</p>
      </div>
    );
  }

  return (
    <div className="curator-reviews">
      <motion.div
        className="curator-reviews__header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Управление отзывами</h1>
        <p>Модерация отзывов о компаниях</p>
      </motion.div>

      <div className="curator-reviews__toolbar">
        <div className="curator-reviews__search">
          <Search size={20} />
          <input
            type="text"
            placeholder="Поиск по тексту или компании..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <div className="curator-reviews__filters">
          {statusOptions.map(option => (
            <button
              key={option.value}
              className={`curator-reviews__filter-btn ${statusFilter === option.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="curator-reviews__list">
        {filteredReviews.length === 0 ? (
          <div className="curator-reviews__empty">
            <div className="curator-reviews__empty-icon"><MessageSquare size={48} /></div>
            <h3>Отзывы не найдены</h3>
            <p>Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          filteredReviews.map((review, index) => (
            <motion.div
              key={review.id}
              className={`curator-reviews__card ${review.is_hidden ? 'curator-reviews__card--hidden' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              <div className="curator-reviews__card-header">
                <div className="curator-reviews__card-company">
                  {review.company?.logo_url ? (
                    <img src={review.company.logo_url} alt={review.company.name} />
                  ) : (
                    <div className="curator-reviews__card-company-placeholder">
                      {review.company?.name?.[0] || '?'}
                    </div>
                  )}
                  <div>
                    <div className="curator-reviews__card-company-name">
                      {review.company?.display_name || review.company?.name}
                    </div>
                    <div className="curator-reviews__card-author">
                      {review.is_anonymous ? (
                        <span>Анонимный пользователь</span>
                      ) : (
                        <span>{review.author?.first_name} {review.author?.last_name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="curator-reviews__card-rating">
                  {renderStars(review.rating)}
                  <span>{review.rating}/5</span>
                </div>
              </div>

              {review.title && (
                <h3 className="curator-reviews__card-title">{review.title}</h3>
              )}

              {review.text && (
                <p className="curator-reviews__card-text">{review.text}</p>
              )}

              {(review.pros || review.cons) && (
                <div className="curator-reviews__card-pros-cons">
                  {review.pros && (
                    <div className="curator-reviews__card-pros">
                      <strong>Плюсы:</strong> {review.pros}
                    </div>
                  )}
                  {review.cons && (
                    <div className="curator-reviews__card-cons">
                      <strong>Минусы:</strong> {review.cons}
                    </div>
                  )}
                </div>
              )}

              <div className="curator-reviews__card-footer">
                <div className="curator-reviews__card-meta">
                  <Calendar size={12} />
                  <span>{formatDate(review.created_at)}</span>
                  <ThumbsUp size={12} />
                  <span>{review.helpful_count} полезных</span>
                </div>
                <div className="curator-reviews__card-badges">
                  {review.is_verified && (
                    <div className="curator-reviews__badge curator-reviews__badge--verified">
                      <CheckCircle size={12} />
                      <span>Подтвержден</span>
                    </div>
                  )}
                  {review.is_hidden && (
                    <div className="curator-reviews__badge curator-reviews__badge--hidden">
                      <AlertCircle size={12} />
                      <span>Скрыт</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="curator-reviews__card-actions">
                {!review.is_verified && !review.is_hidden && (
                  <button
                    className="curator-reviews__action-btn curator-reviews__action-btn--verify"
                    onClick={() => verifyReview(review.id)}
                    disabled={actionLoading === review.id}
                  >
                    {actionLoading === review.id ? <Loader2 size={14} className="spinner" /> : <CheckCircle size={14} />}
                    <span>Подтвердить</span>
                  </button>
                )}
                {!review.is_hidden ? (
                  <button
                    className="curator-reviews__action-btn curator-reviews__action-btn--hide"
                    onClick={() => hideReview(review.id)}
                    disabled={actionLoading === review.id}
                  >
                    {actionLoading === review.id ? <Loader2 size={14} className="spinner" /> : <XCircle size={14} />}
                    <span>Скрыть</span>
                  </button>
                ) : (
                  <button
                    className="curator-reviews__action-btn curator-reviews__action-btn--restore"
                    onClick={() => restoreReview(review.id)}
                    disabled={actionLoading === review.id}
                  >
                    {actionLoading === review.id ? <Loader2 size={14} className="spinner" /> : <Eye size={14} />}
                    <span>Восстановить</span>
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewsPage;