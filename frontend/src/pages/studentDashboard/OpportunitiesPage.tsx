// frontend/src/pages/studentDashboard/OpportunitiesPage.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, MapPin, Briefcase, Eye, Filter, X, 
  ChevronRight, Heart, Star, Clock 
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import OpportunityDetailModal from '../../components/OpportunityDetailModal';
import InteractiveMap from '../../components/InteractiveMap';

interface Opportunity {
  id: number;
  title: string;
  description: string;
  type: 'internship' | 'vacancy' | 'mentorship' | 'event';
  work_format: 'office' | 'hybrid' | 'remote';
  salary_min?: number;
  salary_max?: number;
  city: string;
  company_name?: string;
  company_logo?: string;
  tags: Array<{ id: number; name: string }>;
  views_count: number;
  created_at: string;
  published_at?: string;
  latitude?: number;
  longitude?: number;
}

const OpportunitiesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchOpportunities();
    fetchFavorites();
  }, []);

  useEffect(() => {
    filterOpportunities();
  }, [opportunities, searchQuery, selectedType, selectedFormat]);

  const fetchOpportunities = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch('/api/opportunities?sort=published_at&order=desc&per_page=50', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setOpportunities(data.items || []);
        setFilteredOpportunities(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const response = await fetch('/api/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFavorites(new Set(data.map((item: any) => item.id)));
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (opportunityId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem('access_token');
    const isFavorite = favorites.has(opportunityId);
    
    try {
      const url = `/api/favorites/opportunity/${opportunityId}`;
      const method = isFavorite ? 'DELETE' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        setFavorites(prev => {
          const newSet = new Set(prev);
          if (isFavorite) {
            newSet.delete(opportunityId);
          } else {
            newSet.add(opportunityId);
          }
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const filterOpportunities = () => {
    let filtered = [...opportunities];
    
    if (searchQuery) {
      filtered = filtered.filter(opp =>
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedType) {
      filtered = filtered.filter(opp => opp.type === selectedType);
    }
    
    if (selectedFormat) {
      filtered = filtered.filter(opp => opp.work_format === selectedFormat);
    }
    
    setFilteredOpportunities(filtered);
  };

  const handleOpportunityClick = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setModalOpen(true);
    incrementViewCount(opportunity.id);
  };

  const incrementViewCount = async (opportunityId: number) => {
    const token = localStorage.getItem('access_token');
    try {
      await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ views_count: (selectedOpportunity?.views_count || 0) + 1 }),
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const handleApply = async (opportunityId: number) => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ opportunity_id: opportunityId }),
      });

      if (response.ok) {
        alert('Отклик успешно отправлен!');
        setModalOpen(false);
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при отправке отклика');
      }
    } catch (error) {
      console.error('Error applying:', error);
      alert('Ошибка сети');
    }
  };

  const handleRecommend = (opportunityId: number) => {
    setModalOpen(false);
    navigate(`/student/contacts?recommend=${opportunityId}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('');
    setSelectedFormat('');
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

  const typeOptions = [
    { value: '', label: 'Все типы' },
    { value: 'internship', label: 'Стажировки' },
    { value: 'vacancy', label: 'Вакансии' },
    { value: 'mentorship', label: 'Менторство' },
    { value: 'event', label: 'Мероприятия' },
  ];

  const formatOptions = [
    { value: '', label: 'Все форматы' },
    { value: 'office', label: 'Офис' },
    { value: 'hybrid', label: 'Гибрид' },
    { value: 'remote', label: 'Удаленно' },
  ];

  if (loading) {
    return (
      <div className="opportunities-page__loading">
        <div className="spinner"></div>
        <p>Загрузка возможностей...</p>
      </div>
    );
  }

  return (
    <div className="opportunities-page">
      <div className="opportunities-page__header">
        <h1>Все возможности</h1>
        <p>Найдите стажировку, вакансию или мероприятие для своего развития</p>
      </div>

      <div className="opportunities-page__toolbar">
        <div className="opportunities-page__search">
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
        <button className="opportunities-page__filter-btn" onClick={() => setShowFilters(!showFilters)}>
          <Filter size={20} />
          <span>Фильтры</span>
        </button>
        <div className="opportunities-page__view-toggle">
          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
            <Briefcase size={18} />
          </button>
          <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}>
            <MapPin size={18} />
          </button>
        </div>
      </div>

      {showFilters && (
        <motion.div className="opportunities-page__filters" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="opportunities-page__filter-group">
            <label>Тип возможности</label>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              {typeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="opportunities-page__filter-group">
            <label>Формат работы</label>
            <select value={selectedFormat} onChange={(e) => setSelectedFormat(e.target.value)}>
              {formatOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {(searchQuery || selectedType || selectedFormat) && (
            <button className="opportunities-page__clear-filters" onClick={clearFilters}>
              <X size={14} />
              Сбросить фильтры
            </button>
          )}
        </motion.div>
      )}

      {viewMode === 'map' ? (
        <div className="opportunities-page__map">
          <InteractiveMap 
            opportunities={filteredOpportunities} 
            onMarkerClick={handleOpportunityClick}
          />
        </div>
      ) : (
        <div className="opportunities-page__grid">
          {filteredOpportunities.length === 0 ? (
            <div className="opportunities-page__empty">
              <div className="opportunities-page__empty-icon">🔍</div>
              <h3>Ничего не найдено</h3>
              <p>Попробуйте изменить параметры поиска или сбросить фильтры</p>
              <button onClick={clearFilters} className="opportunities-page__empty-btn">
                Сбросить фильтры
              </button>
            </div>
          ) : (
            filteredOpportunities.map((opp, index) => (
              <motion.div
                key={opp.id}
                className="opportunities-page__card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleOpportunityClick(opp)}
              >
                <button
                  className={`opportunities-page__favorite-btn ${favorites.has(opp.id) ? 'active' : ''}`}
                  onClick={(e) => toggleFavorite(opp.id, e)}
                >
                  <Heart size={16} fill={favorites.has(opp.id) ? '#ff3366' : 'none'} />
                </button>
                
                <div className="opportunities-page__card-header">
                  <div className="opportunities-page__card-badges">
                    <span className={`opportunities-page__type-badge opportunities-page__type-badge--${opp.type}`}>
                      {getTypeLabel(opp.type)}
                    </span>
                    <span className="opportunities-page__format-badge">
                      {getFormatLabel(opp.work_format)}
                    </span>
                  </div>
                </div>
                <h3 className="opportunities-page__card-title">{opp.title}</h3>
                <div className="opportunities-page__card-company">
                  {opp.company_logo ? (
                    <img src={opp.company_logo} alt={opp.company_name} />
                  ) : (
                    <div className="opportunities-page__card-company-placeholder">
                      {opp.company_name?.[0] || '?'}
                    </div>
                  )}
                  <span>{opp.company_name}</span>
                </div>
                <div className="opportunities-page__card-meta">
                  <div className="opportunities-page__card-meta-item">
                    <MapPin size={14} />
                    <span>{opp.city}</span>
                  </div>
                  {formatSalary(opp.salary_min, opp.salary_max) && (
                    <div className="opportunities-page__card-meta-item opportunities-page__card-salary">
                      {formatSalary(opp.salary_min, opp.salary_max)}
                    </div>
                  )}
                  <div className="opportunities-page__card-meta-item">
                    <Eye size={14} />
                    <span>{opp.views_count || 0}</span>
                  </div>
                </div>
                <div className="opportunities-page__card-tags">
                  {opp.tags?.slice(0, 3).map(tag => (
                    <span key={tag.id} className="opportunities-page__card-tag">{tag.name}</span>
                  ))}
                </div>
                <div className="opportunities-page__card-footer">
                  <button className="opportunities-page__card-details">
                    Подробнее <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {selectedOpportunity && (
        <OpportunityDetailModal
          opportunity={selectedOpportunity}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onApply={handleApply}
          onRecommend={() => handleRecommend(selectedOpportunity.id)}
          isFavorite={favorites.has(selectedOpportunity.id)}
          onToggleFavorite={(e) => toggleFavorite(selectedOpportunity.id, e)}
        />
      )}
    </div>
  );
};

export default OpportunitiesPage;