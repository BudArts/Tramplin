// frontend/src/pages/curatorDashboard/CompaniesPage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import {
  Search,
  Building2,
  MapPin,
  Mail,
  Phone,
  Globe,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
  Shield,
  FileText,
  User,
  Briefcase,
  Star,
  Edit3,
  Send,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Company {
  id: number;
  inn: string;
  ogrn?: string;
  name?: string;
  full_name: string;
  short_name?: string;
  brand_name?: string;
  display_name?: string;
  legal_address?: string;
  actual_address?: string;
  city?: string;
  email: string;
  phone?: string;
  website?: string;
  status: 'pending_email' | 'pending_review' | 'active' | 'suspended' | 'rejected';
  verification_status?: 'pending' | 'verified' | 'rejected';
  is_email_verified: boolean;
  description?: string;
  industry?: string;
  logo_url?: string;
  employee_count?: number;
  founded_year?: number;
  trust_level?: 'new' | 'trusted' | 'verified';
  created_at?: string;
  rating?: number;
  reviews_count?: number;
}

interface Opportunity {
  id: number;
  title: string;
  type: string;
  status: string;
  moderation_status: string;
  created_at: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface CuratorContext {
  user: any;
  refreshStats: () => void;
  stats: any;
}

const CompaniesPage = () => {
  const navigate = useNavigate();
  const { companyId } = useParams();
  const { refreshStats } = useOutletContext<CuratorContext>();
  const { user: currentUser } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending_review');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyOpportunities, setCompanyOpportunities] = useState<Opportunity[]>([]);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [additionalInfoRequest, setAdditionalInfoRequest] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAdditionalInfoModal, setShowAdditionalInfoModal] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (companyId && !modalOpen && companies.length > 0) {
      const company = companies.find(c => c.id === parseInt(companyId));
      if (company) {
        handleCompanyClick(company);
      }
    }
  }, [companyId, companies]);

  useEffect(() => {
    filterCompanies();
  }, [companies, searchQuery, statusFilter]);

  const fetchCompanies = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const url = `/api/curator/companies?per_page=200`;
      const response = await fetch(url, {
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

  const filterCompanies = () => {
    let filtered = [...companies];
    
    const selectedOption = statusOptions.find(opt => opt.value === statusFilter);
    if (selectedOption && selectedOption.filter) {
      filtered = filtered.filter(selectedOption.filter);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(company =>
        (company.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         company.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         company.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         company.inn?.includes(searchQuery) ||
         company.email?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    setFilteredCompanies(filtered);
  };

  const handleCompanyClick = async (company: Company) => {
    setSelectedCompany(company);
    await fetchCompanyDetails(company.id);
    setModalOpen(true);
    navigate(`/curator/companies/${company.id}`, { replace: true });
  };

  const fetchCompanyDetails = async (companyId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const [detailsRes, opportunitiesRes, usersRes] = await Promise.all([
        fetch(`/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/opportunities?company_id=${companyId}&per_page=20`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/curator/companies/${companyId}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ ok: false })),
      ]);

      if (detailsRes.ok) {
        const data = await detailsRes.json();
        setSelectedCompany(prev => ({ ...prev, ...data }));
      }
      if (opportunitiesRes.ok) {
        const data = await opportunitiesRes.json();
        setCompanyOpportunities(data.items || []);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setCompanyUsers(data);
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
    }
  };

  const verifyCompany = async (companyId: number, approve: boolean, comment?: string) => {
    setActionLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/curator/companies/${companyId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: approve ? 'verified' : 'rejected',
          comment: comment || null,
        }),
      });

      if (response.ok) {
        await fetchCompanies();
        refreshStats();
        setModalOpen(false);
        setShowRejectModal(false);
        setShowAdditionalInfoModal(false);
        navigate('/curator/companies');
        alert(approve ? 'Компания успешно верифицирована' : 'Компания отклонена');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при обработке запроса');
      }
    } catch (error) {
      console.error('Error verifying company:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(false);
    }
  };

  const requestAdditionalInfo = async (companyId: number, message: string) => {
    setActionLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/curator/companies/${companyId}/request-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      if (response.ok) {
        alert('Запрос на дополнительную информацию отправлен');
        setShowAdditionalInfoModal(false);
        setAdditionalInfoRequest('');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при отправке запроса');
      }
    } catch (error) {
      console.error('Error requesting info:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(false);
    }
  };

  const suspendCompany = async (companyId: number) => {
    setActionLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/curator/companies/${companyId}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchCompanies();
        refreshStats();
        setModalOpen(false);
        alert('Компания заблокирована');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при блокировке компании');
      }
    } catch (error) {
      console.error('Error suspending company:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(false);
    }
  };

  const activateCompany = async (companyId: number) => {
    setActionLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/curator/companies/${companyId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchCompanies();
        refreshStats();
        setModalOpen(false);
        alert('Компания активирована');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при активации компании');
      }
    } catch (error) {
      console.error('Error activating company:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusLabel = (company: Company) => {
    if (!company.is_email_verified) {
      return { label: 'Ожидает подтверждения почты', color: '#ffcc33' };
    }
    if (company.verification_status === 'pending') {
      return { label: 'На проверке', color: '#33ccff' };
    }
    if (company.status === 'active' && company.verification_status === 'verified') {
      return { label: 'Активна', color: '#33ff66' };
    }
    if (company.status === 'suspended') {
      return { label: 'Заблокирована', color: '#ff3366' };
    }
    if (company.verification_status === 'rejected') {
      return { label: 'Отклонена', color: '#ff3366' };
    }
    return { label: company.status, color: '#888' };
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const statusOptions = [
    { 
      value: 'pending_review', 
      label: 'На проверке', 
      filter: (company: Company) => 
        company.verification_status === 'pending' && 
        company.is_email_verified === true &&
        company.status !== 'suspended' &&
        company.status !== 'rejected'
    },
    { 
      value: 'pending_email', 
      label: 'Ожидают почту', 
      filter: (company: Company) => 
        !company.is_email_verified &&
        company.status !== 'suspended' &&
        company.status !== 'rejected'
    },
    { 
      value: 'active', 
      label: 'Активные', 
      filter: (company: Company) => 
        company.status === 'active' && 
        company.verification_status === 'verified' &&
        company.is_email_verified === true
    },
    { 
      value: 'suspended', 
      label: 'Заблокированные', 
      filter: (company: Company) => 
        company.status === 'suspended'
    },
    { 
      value: 'rejected', 
      label: 'Отклоненные', 
      filter: (company: Company) => 
        company.verification_status === 'rejected' ||
        company.status === 'rejected'
    },
  ];

  if (loading) {
    return (
      <div className="curator-companies__loading">
        <div className="spinner"></div>
        <p>Загрузка компаний...</p>
      </div>
    );
  }

  return (
    <div className="curator-companies">
      <motion.div
        className="curator-companies__header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Управление компаниями</h1>
        <p>Верификация, блокировка и управление профилями компаний</p>
      </motion.div>

      <div className="curator-companies__filters">
        <div className="curator-companies__status-filter">
          {statusOptions.map(option => (
            <button
              key={option.value}
              className={`curator-companies__filter-btn ${statusFilter === option.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="curator-companies__search">
          <Search size={20} />
          <input
            type="text"
            placeholder="Поиск по названию, ИНН, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="curator-companies__list">
        {filteredCompanies.length === 0 ? (
          <div className="curator-companies__empty">
            <div className="curator-companies__empty-icon"><Building2 size={48} /></div>
            <h3>Нет компаний</h3>
            <p>Компании не найдены</p>
          </div>
        ) : (
          filteredCompanies.map((company, index) => {
            const statusConfig = getStatusLabel(company);
            return (
              <motion.div
                key={company.id}
                className="curator-companies__card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleCompanyClick(company)}
              >
                <div className="curator-companies__card-logo">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.display_name || company.name} />
                  ) : (
                    <div className="curator-companies__card-logo-placeholder">
                      {company.display_name?.[0] || company.name?.[0] || '?'}
                    </div>
                  )}
                </div>
                <div className="curator-companies__card-info">
                  <div className="curator-companies__card-header">
                    <h3 className="curator-companies__card-name">
                      {company.display_name || company.name || company.full_name}
                    </h3>
                    <div className="curator-companies__card-status" style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}>
                      {statusConfig.label}
                    </div>
                  </div>
                  <div className="curator-companies__card-details">
                    <div className="curator-companies__card-detail">
                      <FileText size={12} />
                      <span>ИНН: {company.inn}</span>
                    </div>
                    {company.city && (
                      <div className="curator-companies__card-detail">
                        <MapPin size={12} />
                        <span>{company.city}</span>
                      </div>
                    )}
                    <div className="curator-companies__card-detail">
                      <Mail size={12} />
                      <span>{company.email}</span>
                    </div>
                  </div>
                  {company.rating !== undefined && company.rating > 0 && (
                    <div className="curator-companies__card-rating">
                      <Star size={12} fill="#ffcc33" stroke="#ffcc33" />
                      <span>{company.rating.toFixed(1)}</span>
                      <span className="curator-companies__card-reviews">({company.reviews_count || 0} отзывов)</span>
                    </div>
                  )}
                </div>
                <div className="curator-companies__card-actions">
                  <button className="curator-companies__card-btn" onClick={(e) => { e.stopPropagation(); handleCompanyClick(company); }}>
                    <Eye size={16} />
                    <span>Просмотр</span>
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Company Detail Modal */}
      <AnimatePresence>
        {modalOpen && selectedCompany && (
          <motion.div
            className="curator-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setModalOpen(false);
              navigate('/curator/companies');
            }}
          >
            <motion.div
              className="curator-modal__content curator-modal__content--large"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="curator-modal__close" onClick={() => {
                setModalOpen(false);
                navigate('/curator/companies');
              }}>
                <X size={20} />
              </button>

              <div className="curator-modal__header">
                <div className="curator-modal__logo">
                  {selectedCompany.logo_url ? (
                    <img src={selectedCompany.logo_url} alt={selectedCompany.display_name} />
                  ) : (
                    <div className="curator-modal__logo-placeholder">
                      {selectedCompany.display_name?.[0] || selectedCompany.name?.[0] || '?'}
                    </div>
                  )}
                </div>
                <div className="curator-modal__info">
                  <h2>{selectedCompany.display_name || selectedCompany.name || selectedCompany.full_name}</h2>
                  <p className="curator-modal__inn">ИНН: {selectedCompany.inn}</p>
                  {selectedCompany.ogrn && <p className="curator-modal__ogrn">ОГРН: {selectedCompany.ogrn}</p>}
                </div>
                <div className="curator-modal__status">
                  <div className="curator-modal__status-badge" style={{
                    background: getStatusLabel(selectedCompany).color + '20',
                    color: getStatusLabel(selectedCompany).color
                  }}>
                    {getStatusLabel(selectedCompany).label}
                  </div>
                  {selectedCompany.is_email_verified && (
                    <div className="curator-modal__verified-badge">
                      <CheckCircle size={14} />
                      <span>Email подтвержден</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="curator-modal__tabs">
                <button className="curator-modal__tab active">Основная информация</button>
                <button className="curator-modal__tab">Вакансии ({companyOpportunities.length})</button>
                <button className="curator-modal__tab">Пользователи ({companyUsers.length})</button>
              </div>

              <div className="curator-modal__tab-content">
                <div className="curator-modal__details">
                  <div className="curator-modal__detail-section">
                    <h4>Контактная информация</h4>
                    <div className="curator-modal__detail-grid">
                      {selectedCompany.email && (
                        <div className="curator-modal__detail-item">
                          <Mail size={16} />
                          <a href={`mailto:${selectedCompany.email}`}>{selectedCompany.email}</a>
                        </div>
                      )}
                      {selectedCompany.phone && (
                        <div className="curator-modal__detail-item">
                          <Phone size={16} />
                          <a href={`tel:${selectedCompany.phone}`}>{selectedCompany.phone}</a>
                        </div>
                      )}
                      {selectedCompany.website && (
                        <div className="curator-modal__detail-item">
                          <Globe size={16} />
                          <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer">{selectedCompany.website}</a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="curator-modal__detail-section">
                    <h4>Адреса</h4>
                    <div className="curator-modal__detail-grid">
                      {selectedCompany.legal_address && (
                        <div className="curator-modal__detail-item">
                          <Building2 size={16} />
                          <span>Юридический: {selectedCompany.legal_address}</span>
                        </div>
                      )}
                      {selectedCompany.actual_address && (
                        <div className="curator-modal__detail-item">
                          <MapPin size={16} />
                          <span>Фактический: {selectedCompany.actual_address}</span>
                        </div>
                      )}
                      {selectedCompany.city && (
                        <div className="curator-modal__detail-item">
                          <MapPin size={16} />
                          <span>Город: {selectedCompany.city}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="curator-modal__detail-section">
                    <h4>О компании</h4>
                    <p className="curator-modal__description">{selectedCompany.description || 'Описание отсутствует'}</p>
                    <div className="curator-modal__detail-grid">
                      {selectedCompany.industry && (
                        <div className="curator-modal__detail-item">
                          <Briefcase size={16} />
                          <span>Отрасль: {selectedCompany.industry}</span>
                        </div>
                      )}
                      {selectedCompany.employee_count && (
                        <div className="curator-modal__detail-item">
                          <Users size={16} />
                          <span>Сотрудников: {selectedCompany.employee_count}+</span>
                        </div>
                      )}
                      {selectedCompany.founded_year && (
                        <div className="curator-modal__detail-item">
                          <Calendar size={16} />
                          <span>Основана: {selectedCompany.founded_year}</span>
                        </div>
                      )}
                      {selectedCompany.trust_level && (
                        <div className="curator-modal__detail-item">
                          <Shield size={16} />
                          <span>Уровень доверия: {
                            selectedCompany.trust_level === 'verified' ? 'Верифицирована' :
                            selectedCompany.trust_level === 'trusted' ? 'Надёжная' : 'Новая'
                          }</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="curator-modal__detail-section">
                    <h4>Даты</h4>
                    <div className="curator-modal__detail-grid">
                      <div className="curator-modal__detail-item">
                        <Calendar size={16} />
                        <span>Создана: {formatDate(selectedCompany.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="curator-modal__actions">
                {selectedCompany.verification_status === 'pending' && selectedCompany.is_email_verified && (
                  <>
                    <button
                      className="curator-modal__action-btn curator-modal__action-btn--approve"
                      onClick={() => verifyCompany(selectedCompany.id, true)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 size={18} className="spinner" /> : <CheckCircle size={18} />}
                      <span>Подтвердить</span>
                    </button>
                    <button
                      className="curator-modal__action-btn curator-modal__action-btn--info"
                      onClick={() => setShowAdditionalInfoModal(true)}
                      disabled={actionLoading}
                    >
                      <Edit3 size={18} />
                      <span>Запросить доп. информацию</span>
                    </button>
                    <button
                      className="curator-modal__action-btn curator-modal__action-btn--reject"
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 size={18} className="spinner" /> : <XCircle size={18} />}
                      <span>Отклонить</span>
                    </button>
                  </>
                )}
                {!selectedCompany.is_email_verified && (
                  <div className="curator-modal__info-message">
                    <AlertCircle size={18} />
                    <span>Компания ожидает подтверждения email</span>
                  </div>
                )}
                {selectedCompany.status === 'active' && selectedCompany.verification_status === 'verified' && (
                  <button
                    className="curator-modal__action-btn curator-modal__action-btn--suspend"
                    onClick={() => suspendCompany(selectedCompany.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 size={18} className="spinner" /> : <AlertCircle size={18} />}
                    <span>Заблокировать</span>
                  </button>
                )}
                {selectedCompany.status === 'suspended' && (
                  <button
                    className="curator-modal__action-btn curator-modal__action-btn--activate"
                    onClick={() => activateCompany(selectedCompany.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 size={18} className="spinner" /> : <CheckCircle size={18} />}
                    <span>Активировать</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedCompany && (
          <motion.div
            className="curator-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              className="curator-modal__content curator-modal__content--small"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <h3>Причина отклонения</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Укажите причину отклонения компании..."
                rows={4}
              />
              <div className="curator-modal__actions">
                <button
                  className="curator-modal__action-btn curator-modal__action-btn--cancel"
                  onClick={() => setShowRejectModal(false)}
                >
                  Отмена
                </button>
                <button
                  className="curator-modal__action-btn curator-modal__action-btn--reject"
                  onClick={() => verifyCompany(selectedCompany.id, false, rejectReason)}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 size={18} className="spinner" /> : 'Отклонить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request Additional Info Modal */}
      <AnimatePresence>
        {showAdditionalInfoModal && selectedCompany && (
          <motion.div
            className="curator-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAdditionalInfoModal(false)}
          >
            <motion.div
              className="curator-modal__content curator-modal__content--small"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <h3>Запрос дополнительной информации</h3>
              <textarea
                value={additionalInfoRequest}
                onChange={(e) => setAdditionalInfoRequest(e.target.value)}
                placeholder="Укажите, какую информацию нужно предоставить..."
                rows={4}
              />
              <div className="curator-modal__actions">
                <button
                  className="curator-modal__action-btn curator-modal__action-btn--cancel"
                  onClick={() => setShowAdditionalInfoModal(false)}
                >
                  Отмена
                </button>
                <button
                  className="curator-modal__action-btn curator-modal__action-btn--info"
                  onClick={() => requestAdditionalInfo(selectedCompany.id, additionalInfoRequest)}
                  disabled={actionLoading || !additionalInfoRequest.trim()}
                >
                  {actionLoading ? <Loader2 size={18} className="spinner" /> : <Send size={18} />}
                  <span>Отправить запрос</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompaniesPage;