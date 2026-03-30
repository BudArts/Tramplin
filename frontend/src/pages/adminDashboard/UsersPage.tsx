// frontend/src/pages/adminDashboard/UsersPage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Search,
  Users,
  User,
  Mail,
  Phone,
  GraduationCap,
  Building2,
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
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  patronymic?: string;
  display_name?: string;
  phone?: string;
  role: 'student' | 'company' | 'curator' | 'admin';
  status: 'pending' | 'active' | 'suspended' | 'deleted';
  is_active?: boolean;
  is_email_verified: boolean;
  university?: string;
  faculty?: string;
  course?: number;
  graduation_year?: number;
  bio?: string;
  avatar_url?: string;
  company_id?: number;
  company_name?: string;
  created_at: string;
}

interface AdminContext {
  user: any;
  refreshStats: () => void;
  stats: any;
}

const UsersPage = () => {
  const navigate = useNavigate();
  const { refreshStats } = useOutletContext<AdminContext>();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery]);

  const fetchUsers = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      let url = `/api/curator/users?per_page=100`;
      if (roleFilter) url += `&role=${roleFilter}`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data);
      } else {
        console.error('Failed to fetch users:', response.status);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];
    
    if (searchQuery) {
      filtered = filtered.filter(user =>
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (statusFilter) {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => user.status === 'active' && user.is_active !== false);
      } else if (statusFilter === 'suspended') {
        filtered = filtered.filter(user => user.status === 'suspended' || user.is_active === false);
      } else if (statusFilter === 'pending') {
        filtered = filtered.filter(user => user.status === 'pending');
      }
    }
    
    setFilteredUsers(filtered);
  };

  const handleUserClick = async (user: User) => {
    setSelectedUser(user);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      display_name: user.display_name,
      phone: user.phone,
      university: user.university,
      faculty: user.faculty,
      course: user.course,
      graduation_year: user.graduation_year,
      bio: user.bio,
    });
    setIsEditing(false);
    setModalOpen(true);
  };

  const updateUserStatus = async (userId: number, isActive: boolean) => {
    setActionLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      // Используем правильный эндпоинт для изменения статуса
      const response = await fetch(`/api/curator/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: isActive }),
      });

      if (response.ok) {
        await fetchUsers();
        refreshStats();
        setModalOpen(false);
        alert(isActive ? 'Пользователь активирован' : 'Пользователь заблокирован');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при изменении статуса');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(false);
    }
  };

  const updateUserRole = async (userId: number, role: string) => {
    setActionLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/curator/users/${userId}/role?new_role=${role}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchUsers();
        refreshStats();
        alert('Роль пользователя изменена');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при изменении роли');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(false);
    }
  };

  const editUser = async () => {
    setActionLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token || !selectedUser) return;

    try {
      const response = await fetch(`/api/curator/users/${selectedUser.id}`, {
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
          university: editForm.university,
          faculty: editForm.faculty,
          course: editForm.course,
          graduation_year: editForm.graduation_year,
          bio: editForm.bio,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setSelectedUser(updatedUser);
        setIsEditing(false);
        await fetchUsers();
        refreshStats();
        alert('Данные пользователя обновлены');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при обновлении данных');
      }
    } catch (error) {
      console.error('Error editing user:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteUser = async (userId: number) => {
  if (!confirm('Вы уверены, что хотите удалить этого пользователя? Все данные пользователя (профиль, отклики, избранное, сообщения) будут безвозвратно удалены. Это действие нельзя отменить.')) return;
  
  setActionLoading(true);
  const token = localStorage.getItem('access_token');
  if (!token) {
    setActionLoading(false);
    return;
  }

  try {
    // Используем правильный эндпоинт из спецификации: DELETE /users/{user_id}
    const response = await fetch(`/users/${userId}`, {
      method: 'DELETE',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });

    if (response.ok) {
      await fetchUsers();
      refreshStats();
      setModalOpen(false);
      alert('Пользователь успешно удален');
    } else {
      const error = await response.json().catch(() => null);
      alert(error?.detail || 'Ошибка при удалении пользователя');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    alert('Ошибка сети. Проверьте подключение.');
  } finally {
    setActionLoading(false);
  }
};

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'student': return { label: 'Студент', icon: GraduationCap, color: '#33ccff' };
      case 'company': return { label: 'Компания', icon: Building2, color: '#33ff66' };
      case 'curator': return { label: 'Куратор', icon: Shield, color: '#ffcc33' };
      case 'admin': return { label: 'Админ', icon: Shield, color: '#ff3366' };
      default: return { label: role, icon: User, color: '#888' };
    }
  };

  const getStatusLabel = (user: User) => {
    const isActive = user.is_active !== false && user.status !== 'suspended';
    if (user.status === 'suspended' || user.is_active === false) {
      return { label: 'Заблокирован', color: '#ff3366' };
    }
    if (user.status === 'pending') {
      return { label: 'Ожидает', color: '#ffcc33' };
    }
    if (isActive) {
      return { label: 'Активен', color: '#33ff66' };
    }
    return { label: user.status, color: '#888' };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const roleOptions = [
    { value: '', label: 'Все роли' },
    { value: 'student', label: 'Студенты' },
    { value: 'company', label: 'Компании' },
    { value: 'curator', label: 'Кураторы' },
    { value: 'admin', label: 'Администраторы' },
  ];

  const statusOptions = [
    { value: '', label: 'Все статусы' },
    { value: 'active', label: 'Активные' },
    { value: 'suspended', label: 'Заблокированные' },
    { value: 'pending', label: 'Ожидают' },
  ];

  if (loading) {
    return (
      <div className="admin-users__loading">
        <div className="spinner"></div>
        <p>Загрузка пользователей...</p>
      </div>
    );
  }

  return (
    <div className="admin-users">
      <motion.div
        className="admin-users__header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Управление пользователями</h1>
        <p>Просмотр, редактирование и управление статусами пользователей</p>
      </motion.div>

      <div className="admin-users__filters">
        <div className="admin-users__search">
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
          className="admin-users__filter-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          {roleOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          className="admin-users__filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="admin-users__list">
        {filteredUsers.length === 0 ? (
          <div className="admin-users__empty">
            <div className="admin-users__empty-icon"><Users size={48} /></div>
            <h3>Пользователи не найдены</h3>
            <p>Попробуйте изменить параметры поиска</p>
          </div>
        ) : (
          filteredUsers.map((user, index) => {
            const roleConfig = getRoleLabel(user.role);
            const RoleIcon = roleConfig.icon;
            const statusConfig = getStatusLabel(user);
            return (
              <motion.div
                key={user.id}
                className="admin-users__card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => handleUserClick(user)}
              >
                <div className="admin-users__card-avatar">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
                  ) : (
                    <div className="admin-users__card-avatar-placeholder">
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </div>
                  )}
                </div>
                <div className="admin-users__card-info">
                  <div className="admin-users__card-header">
                    <h3 className="admin-users__card-name">
                      {user.display_name || `${user.first_name} ${user.last_name}`}
                    </h3>
                    <div className="admin-users__card-badges">
                      <div className="admin-users__card-role" style={{ backgroundColor: `${roleConfig.color}20`, color: roleConfig.color }}>
                        <RoleIcon size={12} />
                        <span>{roleConfig.label}</span>
                      </div>
                      <div className="admin-users__card-status" style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}>
                        {statusConfig.label}
                      </div>
                      {user.is_email_verified && (
                        <div className="admin-users__card-verified">
                          <CheckCircle size={12} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="admin-users__card-details">
                    <div className="admin-users__card-detail">
                      <Mail size={12} />
                      <span>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="admin-users__card-detail">
                        <Phone size={12} />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    {user.university && (
                      <div className="admin-users__card-detail">
                        <GraduationCap size={12} />
                        <span>{user.university} {user.course ? `• ${user.course} курс` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="admin-users__card-actions">
                  <button className="admin-users__card-btn">
                    <Eye size={16} />
                    <span>Просмотр</span>
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {modalOpen && selectedUser && (
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
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" />
                  ) : (
                    <div className="admin-modal__avatar-placeholder">
                      {selectedUser.first_name?.[0]}{selectedUser.last_name?.[0]}
                    </div>
                  )}
                </div>
                <div className="admin-modal__info">
                  {!isEditing ? (
                    <>
                      <h2>{selectedUser.display_name || `${selectedUser.first_name} ${selectedUser.last_name}`}</h2>
                      <p className="admin-modal__email">{selectedUser.email}</p>
                      <div className="admin-modal__badges">
                        <div className="admin-modal__role-badge">
                          {getRoleLabel(selectedUser.role).label}
                        </div>
                        {selectedUser.is_email_verified && (
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

              {!isEditing ? (
                <>
                  <div className="admin-modal__tabs">
                    <button className="admin-modal__tab active">Личная информация</button>
                    {selectedUser.role === 'student' && <button className="admin-modal__tab">Образование</button>}
                    {selectedUser.role === 'company' && <button className="admin-modal__tab">Компания</button>}
                  </div>

                  <div className="admin-modal__tab-content">
                    <div className="admin-modal__details">
                      <div className="admin-modal__detail-section">
                        <h4>Контактная информация</h4>
                        <div className="admin-modal__detail-grid">
                          <div className="admin-modal__detail-item">
                            <Mail size={16} />
                            <span>{selectedUser.email}</span>
                          </div>
                          {selectedUser.phone && (
                            <div className="admin-modal__detail-item">
                              <Phone size={16} />
                              <span>{selectedUser.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedUser.role === 'student' && (
                        <div className="admin-modal__detail-section">
                          <h4>Образование</h4>
                          <div className="admin-modal__detail-grid">
                            {selectedUser.university && (
                              <div className="admin-modal__detail-item">
                                <GraduationCap size={16} />
                                <span>{selectedUser.university}</span>
                              </div>
                            )}
                            {selectedUser.faculty && (
                              <div className="admin-modal__detail-item">
                                <GraduationCap size={16} />
                                <span>Факультет: {selectedUser.faculty}</span>
                              </div>
                            )}
                            {selectedUser.course && (
                              <div className="admin-modal__detail-item">
                                <GraduationCap size={16} />
                                <span>Курс: {selectedUser.course}</span>
                              </div>
                            )}
                            {selectedUser.graduation_year && (
                              <div className="admin-modal__detail-item">
                                <Calendar size={16} />
                                <span>Год окончания: {selectedUser.graduation_year}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedUser.role === 'company' && selectedUser.company_name && (
                        <div className="admin-modal__detail-section">
                          <h4>Компания</h4>
                          <div className="admin-modal__detail-grid">
                            <div className="admin-modal__detail-item">
                              <Building2 size={16} />
                              <span>{selectedUser.company_name}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedUser.bio && (
                        <div className="admin-modal__detail-section">
                          <h4>О себе</h4>
                          <p className="admin-modal__bio">{selectedUser.bio}</p>
                        </div>
                      )}

                      <div className="admin-modal__detail-section">
                        <h4>Дата регистрации</h4>
                        <div className="admin-modal__detail-grid">
                          <div className="admin-modal__detail-item">
                            <Calendar size={16} />
                            <span>{formatDate(selectedUser.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="admin-modal__edit-section">
                  {selectedUser.role === 'student' && (
                    <>
                      <h4>Образование</h4>
                      <input
                        type="text"
                        placeholder="Университет"
                        value={editForm.university || ''}
                        onChange={(e) => setEditForm({ ...editForm, university: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Факультет"
                        value={editForm.faculty || ''}
                        onChange={(e) => setEditForm({ ...editForm, faculty: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="Курс"
                        value={editForm.course || ''}
                        onChange={(e) => setEditForm({ ...editForm, course: parseInt(e.target.value) })}
                      />
                      <input
                        type="number"
                        placeholder="Год окончания"
                        value={editForm.graduation_year || ''}
                        onChange={(e) => setEditForm({ ...editForm, graduation_year: parseInt(e.target.value) })}
                      />
                    </>
                  )}
                  <textarea
                    placeholder="О себе"
                    value={editForm.bio || ''}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    rows={4}
                  />
                </div>
              )}

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
                    <select
                      className="admin-modal__role-select"
                      value={selectedUser.role}
                      onChange={(e) => updateUserRole(selectedUser.id, e.target.value)}
                      disabled={actionLoading}
                    >
                      <option value="student">Студент</option>
                      <option value="company">Компания</option>
                      <option value="curator">Куратор</option>
                      <option value="admin">Администратор</option>
                    </select>
                    {getStatusLabel(selectedUser).label === 'Активен' ? (
                      <button
                        className="admin-modal__action-btn admin-modal__action-btn--suspend"
                        onClick={() => updateUserStatus(selectedUser.id, false)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 size={18} className="spinner" /> : <AlertCircle size={18} />}
                        <span>Заблокировать</span>
                      </button>
                    ) : getStatusLabel(selectedUser).label === 'Заблокирован' ? (
                      <button
                        className="admin-modal__action-btn admin-modal__action-btn--activate"
                        onClick={() => updateUserStatus(selectedUser.id, true)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <Loader2 size={18} className="spinner" /> : <CheckCircle size={18} />}
                        <span>Активировать</span>
                      </button>
                    ) : null}
                    {selectedUser.id !== currentUser?.id && (
                      <button
                        className="admin-modal__action-btn admin-modal__action-btn--delete"
                        onClick={() => deleteUser(selectedUser.id)}
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
                      onClick={editUser}
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

export default UsersPage;