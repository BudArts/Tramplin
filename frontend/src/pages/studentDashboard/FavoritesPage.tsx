// frontend/src/pages/studentDashboard/FavoritesPage.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Building2, MapPin, Briefcase, Calendar, X, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Opportunity {
  id: number;
  title: string;
  type: 'internship' | 'vacancy' | 'mentorship' | 'event';
  work_format: 'office' | 'hybrid' | 'remote';
  salary_min?: number;
  salary_max?: number;
  city: string;
  company_name?: string;
  company_logo?: string;
  tags: Array<{ id: number; name: string }>;
}

interface Company {
  id: number;
  name?: string;
  short_name?: string;
  brand_name?: string;
  logo_url?: string;
  industry?: string;
  city?: string;
}

const FavoritesPage = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<{ opportunities: Opportunity[]; companies: Company[] }>({
    opportunities: [],
    companies: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'opportunities' | 'companies'>('opportunities');
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const [oppRes, compRes] = await Promise.all([
        fetch(`/api/favorites`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/favorites/companies`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (oppRes.ok) {
        const oppData = await oppRes.json();
        setFavorites(prev => ({ ...prev, opportunities: oppData }));
      }
      if (compRes.ok) {
        const compData = await compRes.json();
        setFavorites(prev => ({ ...prev, companies: compData }));
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (id: number, type: 'opportunity' | 'company') => {
    setRemovingId(id);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const url = type === 'opportunity' ? `/api/favorites/opportunity/${id}` : `/api/favorites/company/${id}`;
      const response = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });

      if (response.ok) {
        if (type === 'opportunity') {
          setFavorites(prev => ({ ...prev, opportunities: prev.opportunities.filter(opp => opp.id !== id) }));
        } else {
          setFavorites(prev => ({ ...prev, companies: prev.companies.filter(comp => comp.id !== id) }));
        }
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    } finally {
      setRemovingId(null);
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

  if (loading) {
    return (
      <div className="student-favorites__loading">
        <div className="spinner"></div>
        <p>Загрузка избранного...</p>
      </div>
    );
  }

  const hasFavorites = activeTab === 'opportunities' ? favorites.opportunities.length > 0 : favorites.companies.length > 0;

  return (
    <div className="student-favorites">
      <motion.div className="student-favorites__header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1>Избранное</h1>
        <p>Сохраненные вакансии, стажировки и компании</p>
      </motion.div>

      <div className="student-favorites__tabs">
        <button className={`student-favorites__tab ${activeTab === 'opportunities' ? 'active' : ''}`} onClick={() => setActiveTab('opportunities')}>
          <Briefcase size={18} />
          <span>Возможности</span>
          {favorites.opportunities.length > 0 && <span className="student-favorites__tab-count">{favorites.opportunities.length}</span>}
        </button>
        <button className={`student-favorites__tab ${activeTab === 'companies' ? 'active' : ''}`} onClick={() => setActiveTab('companies')}>
          <Building2 size={18} />
          <span>Компании</span>
          {favorites.companies.length > 0 && <span className="student-favorites__tab-count">{favorites.companies.length}</span>}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!hasFavorites ? (
          <motion.div key="empty" className="student-favorites__empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="student-favorites__empty-icon"><Heart size={48} /></div>
            <h3>Избранное пусто</h3>
            <p>{activeTab === 'opportunities' ? 'Добавляйте вакансии и стажировки в избранное' : 'Добавляйте компании в избранное'}</p>
            <button className="student-favorites__empty-btn" onClick={() => navigate('/')}>На главную</button>
          </motion.div>
        ) : (
          <motion.div key={activeTab} className="student-favorites__grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {activeTab === 'opportunities'
              ? favorites.opportunities.map((opp, index) => (
                  <motion.div key={opp.id} className="student-favorites__card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} onClick={() => navigate(`/opportunities/${opp.id}`)}>
                    <div className="student-favorites__card-header">
                      <div className="student-favorites__card-badges">
                        <span className={`student-favorites__type-badge student-favorites__type-badge--${opp.type}`}>{getTypeLabel(opp.type)}</span>
                        <span className="student-favorites__format-badge">{getFormatLabel(opp.work_format)}</span>
                      </div>
                      <button className="student-favorites__remove-btn" onClick={(e) => { e.stopPropagation(); removeFavorite(opp.id, 'opportunity'); }} disabled={removingId === opp.id}>
                        {removingId === opp.id ? <div className="spinner-small"></div> : <X size={16} />}
                      </button>
                    </div>
                    <h3 className="student-favorites__card-title">{opp.title}</h3>
                    <div className="student-favorites__card-company">
                      {opp.company_logo ? <img src={opp.company_logo} alt={opp.company_name} /> : <div className="student-favorites__card-company-placeholder">{opp.company_name?.[0] || '?'}</div>}
                      <span>{opp.company_name}</span>
                    </div>
                    <div className="student-favorites__card-meta">
                      <div className="student-favorites__card-meta-item"><MapPin size={14} /><span>{opp.city}</span></div>
                      {formatSalary(opp.salary_min, opp.salary_max) && <div className="student-favorites__card-meta-item student-favorites__card-salary">{formatSalary(opp.salary_min, opp.salary_max)}</div>}
                    </div>
                    {opp.tags.length > 0 && (
                      <div className="student-favorites__card-tags">
                        {opp.tags.slice(0, 3).map(tag => <span key={tag.id} className="student-favorites__card-tag">{tag.name}</span>)}
                        {opp.tags.length > 3 && <span className="student-favorites__card-tag-more">+{opp.tags.length - 3}</span>}
                      </div>
                    )}
                  </motion.div>
                ))
              : favorites.companies.map((company, index) => (
                  <motion.div key={company.id} className="student-favorites__card student-favorites__card--company" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} onClick={() => navigate(`/companies/${company.id}`)}>
                    <div className="student-favorites__card-header">
                      <div className="student-favorites__card-logo">
                        {company.logo_url ? <img src={company.logo_url} alt={company.name} /> : <div className="student-favorites__card-logo-placeholder">{company.name?.[0] || company.short_name?.[0] || '?'}</div>}
                      </div>
                      <button className="student-favorites__remove-btn" onClick={(e) => { e.stopPropagation(); removeFavorite(company.id, 'company'); }} disabled={removingId === company.id}>
                        {removingId === company.id ? <div className="spinner-small"></div> : <X size={16} />}
                      </button>
                    </div>
                    <h3 className="student-favorites__card-title">{company.brand_name || company.name || company.short_name}</h3>
                    <div className="student-favorites__card-company-info">
                      {company.industry && <div className="student-favorites__card-info-item"><Briefcase size={14} /><span>{company.industry}</span></div>}
                      {company.city && <div className="student-favorites__card-info-item"><MapPin size={14} /><span>{company.city}</span></div>}
                    </div>
                  </motion.div>
                ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FavoritesPage;