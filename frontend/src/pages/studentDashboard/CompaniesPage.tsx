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
  Eye
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

const CompaniesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyOpportunities, setCompanyOpportunities] = useState<Opportunity[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);
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
        headers: { Authorization: `Bearer ${token}` },
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
      const url = isFavorite 
        ? `/api/favorites/company/${companyId}`
        : `/api/favorites/company/${companyId}`;
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
        headers: { Authorization: `Bearer ${token}` },
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

  const handleCompanyClick = async (company: Company) => {
    setSelectedCompany(company);
    await fetchCompanyOpportunities(company.id);
    setModalOpen(true);
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