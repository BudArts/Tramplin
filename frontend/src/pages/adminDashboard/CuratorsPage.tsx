// frontend/src/pages/adminDashboard/CuratorsPage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Search,
  Users,
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  X,
  Loader2,
  ChevronRight,
  Edit2,
  Save,
  Trash2,
  UserCog,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Curator {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  patronymic?: string;
  display_name?: string;
  phone?: string;
  role: 'curator' | 'admin';
  status: 'active' | 'suspended';
  is_email_verified: boolean;
  created_at: string;
  avatar_url?: string;
  created_by?: number;
}

interface AdminContext {
  user: any;
  refreshStats: () => void;
  stats: any;
}

const CuratorsPage = () => {
  const navigate = useNavigate();
  const { refreshStats } = useOutletContext<AdminContext>();
  const { user: currentUser } = useAuth();
  const [curators, setCurators] = useState<Curator[]>([]);
  const [filteredCurators, setFilteredCurators] = useState<Curator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedCurator, setSelectedCurator] = useState<Curator | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Curator>>({});

  useEffect(() => {
    fetchCurators();
  }, [statusFilter]);

  useEffect(() => {
    filterCurators();
  }, [curators, searchQuery]);

  const fetchCurators = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      let url = `/api/curator/users?role=curator&per_page=100`;
      if (statusFilter === 'active') {
        url += `&is_active=true`;
      } else if (statusFilter === 'suspended') {
        url += `&is_active=false`;
      }
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCurators(data);
        setFilteredCurators(data);
      }
    } catch (error) {
      console.error('Error fetching curators:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCurators = () => {
    let filtered = [...curators];
    
    if (searchQuery) {
      filtered = filtered.filter(curator =>
        `${curator.first_name} ${curator.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        curator.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        curator.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredCurators(filtered);
  };

  const handleCuratorClick = async (curator: Curator) => {
    setSelectedCurator(curator);
    setEditForm({
      first_name: curator.first_name,
      last_name: curator.last_name,
      display_name: curator.display_name,
      phone: curator.phone,
    });
    setIsEditing(false);
    setModalOpen(true);
  };

  const updateCuratorStatus = async (curatorId: number, isActive: boolean) => {
    setActionLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/curator/users/${curatorId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: isActive }),
      });

      if (response.ok) {
        await fetchCurators();
        refreshStats();
        setModalOpen(false);
        alert(isActive ? 'Куратор активирован' : 'Куратор заблокирован');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при изменении статуса');
      }
    } catch (error) {
      console.error('Error updating curator status:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteCurator = async (curatorId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этого куратора? Это действие нельзя отменить.')) return;
    
    setActionLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/curator/users/${curatorId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchCurators();
        refreshStats();
        setModalOpen(false);
        alert('Куратор удален');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при удалении куратора');
      }
    } catch (error) {
      console.error('Error deleting curator:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(false);
    }
  };

  const editCurator = async () => {
    setActionLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token || !selectedCurator) return;

    try {
      const response = await fetch(`/api/curator/users/${selectedCurator.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: editForm.display_name,
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone: editForm.phone,
        }),
      });

      if (response.ok) {
        const updatedCurator = await response.json();
        setSelectedCurator(updatedCurator);
        setIsEditing(false);
        await fetchCurators();
        refreshStats();
        alert('Данные куратора обновлены');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при обновлении данных');
      }
    } catch (error) {
      console.error('Error editing curator:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return { label: 'Активен', color: '#33ff66' };
      case 'suspended': return { label: 'Заблокирован', color: '#ff3366' };
      default: return { label: status, color: '#888' };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const statusOptions = [
    { value: '', label: 'Все кураторы' },
    { value: 'active', label: 'Активные' },
    { value: 'suspended', label: 'Заблокированные' },
  ];

  if (loading) {
    return (
      <div className="admin-curators__loading">
        <div className="spinner"></div>
        <p>Загрузка кураторов...</p>
      </div>
    );
  }

  return (
    <div className="admin-curators">
      <motion.div
        className="admin-curators__header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Управление кураторами</h1>
        <p>Просмотр, редактирование и управление статусами кураторов платформы</p>
      </motion.div>

      <div className="admin-curators__toolbar">
        <div className="admin-curators__search">
          <Search size={20} />
          <input
            type="text"
            placeholder="Поиск по имени или email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <select
          className="admin-curators__filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          className="admin-curators__create-btn"
          onClick={() => navigate('/admin/curators/create')}
        >
          <UserPlus size={18} />
          <span>Создать куратора</span>
        </button>
      </div>

      <div className="admin-curators__list">
        {filteredCurators.length === 0 ? (
          <div className="admin-curators__empty">
            <div className="admin-curators__empty-icon"><UserCog size={48} /></div>
            <h3>Кураторы не найдены</h3>
            <p>Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          filteredCurators.map((curator, index) => {
            const statusConfig = getStatusLabel(curator.status);
            return (
              <motion.div
                key={curator.id}
                className="admin-curators__card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => handleCuratorClick(curator)}
              >
                <div className="admin-curators__card-avatar">
                  {curator.avatar_url ? (
                    <img src={curator.avatar_url} alt={`${curator.first_name} ${curator.last_name}`} />
                  ) : (
                    <div className="admin-curators__card-avatar-placeholder">
                      {curator.first_name?.[0]}{curator.last_name?.[0]}
                    </div>
                  )}
                </div>
                <div className="admin-curators__card-info">
                  <div className="admin-curators__card-header">
                    <h3 className="admin-curators__card-name">
                      {curator.display_name || `${curator.first_name} ${curator.last_name}`}
                    </h3>
                    <div className="admin-curators__card-badges">
                      <div className="admin-curators__card-role">
                        <Shield size={12} />
                        <span>{curator.role === 'admin' ? 'Администратор' : 'Куратор'}</span>
                      </div>
                      <div className="admin-curators__card-status" style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}>
                        {statusConfig.label}
                      </div>
                      {curator.is_email_verified && (
                        <div className="admin-curators__card-verified">
                          <CheckCircle size={12} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="admin-curators__card-details">
                    <div className="admin-curators__card-detail">
                      <Mail size={12} />
                      <span>{curator.email}</span>
                    </div>
                    {curator.phone && (
                      <div className="admin-curators__card-detail">
                        <Phone size={12} />
                        <span>{curator.phone}</span>
                      </div>
                    )}
                    <div className="admin-curators__card-detail">
                      <Calendar size={12} />
                      <span>Создан: {formatDate(curator.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="admin-curators__card-actions">
                  <button className="admin-curators__card-btn">
                    <Eye size={16} />
                    <span>Просмотр</span>
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Curator Detail Modal */}
      <AnimatePresence>
        {modalOpen && selectedCurator && (
          <motion.div
            className="admin-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              className="admin-modal__content admin-modal__content--large"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="admin-modal__close" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>

              <div className="admin-modal__header">
                <div className="admin-modal__avatar">
                  {selectedCurator.avatar_url ? (
                    <img src={selectedCurator.avatar_url} alt="" />
                  ) : (
                    <div className="admin-modal__avatar-placeholder">
                      {selectedCurator.first_name?.[0]}{selectedCurator.last_name?.[0]}
                    </div>
                  )}
                </div>
                <div className="admin-modal__info">
                  {!isEditing ? (
                    <>
                      <h2>{selectedCurator.display_name || `${selectedCurator.first_name} ${selectedCurator.last_name}`}</h2>
                      <p className="admin-modal__email">{selectedCurator.email}</p>
                      <div className="admin-modal__badges">
                        <div className="admin-modal__role-badge">
                          {selectedCurator.role === 'admin' ? 'Администратор' : 'Куратор'}
                        </div>
                        {selectedCurator.is_email_verified && (
                          <div className="admin-modal__verified-badge">
                            <CheckCircle size={14} />
                            <span>Email подтвержден</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="admin-modal__edit-form">
                      <input
                        type="text"
                        placeholder="Имя"
                        value={editForm.first_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Фамилия"
                        value={editForm.last_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Отображаемое имя"
                        value={editForm.display_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                      />
                      <input
                        type="tel"
                        placeholder="Телефон"
                        value={editForm.phone || ''}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-modal__details">
                <div className="admin-modal__detail-section">
                  <h4>Контактная информация</h4>
                  <div className="admin-modal__detail-grid">
                    <div className="admin-modal__detail-item">
                      <Mail size={16} />
                      <span>{selectedCurator.email}</span>
                    </div>
                    {selectedCurator.phone && (
                      <div className="admin-modal__detail-item">
                        <Phone size={16} />
                        <span>{selectedCurator.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="admin-modal__detail-section">
                  <h4>Дата регистрации</h4>
                  <div className="admin-modal__detail-grid">
                    <div className="admin-modal__detail-item">
                      <Calendar size={16} />
                      <span>{formatDate(selectedCurator.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-modal__actions">
                {!isEditing ? (
                  <>
                    <button
                      className="admin-modal__action-btn admin-modal__action-btn--edit"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 size={18} />
                      <span>Редактировать</span>
                    </button>
                    {selectedCurator.status === 'active' ? (
                      <button
                        className="admin-modal__action-btn admin-modal__action-btn--suspend"
                        onClick={() => updateCuratorStatus(selectedCurator.id, false)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 size={18} className="spinner" /> : <AlertCircle size={18} />}
                        <span>Заблокировать</span>
                      </button>
                    ) : selectedCurator.status === 'suspended' ? (
                      <button
                        className="admin-modal__action-btn admin-modal__action-btn--activate"
                        onClick={() => updateCuratorStatus(selectedCurator.id, true)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 size={18} className="spinner" /> : <CheckCircle size={18} />}
                        <span>Активировать</span>
                      </button>
                    ) : null}
                    {selectedCurator.id !== currentUser?.id && (
                      <button
                        className="admin-modal__action-btn admin-modal__action-btn--delete"
                        onClick={() => deleteCurator(selectedCurator.id)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 size={18} className="spinner" /> : <Trash2 size={18} />}
                        <span>Удалить</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      className="admin-modal__action-btn admin-modal__action-btn--cancel"
                      onClick={() => setIsEditing(false)}
                    >
                      Отмена
                    </button>
                    <button
                      className="admin-modal__action-btn admin-modal__action-btn--save"
                      onClick={editCurator}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 size={18} className="spinner" /> : <Save size={18} />}
                      <span>Сохранить</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CuratorsPage;