// frontend/src/pages/studentDashboard/ContactsPage.tsx
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Users, UserPlus, MessageCircle, Search, X, Check, Clock, Briefcase, Star, Bell, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Contact {
  id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    display_name?: string;
    avatar_url?: string;
    university?: string;
    role?: string
  };
  contact: {
    id: number;
    first_name: string;
    last_name: string;
    display_name?: string;
    avatar_url?: string;
    university?: string;
    role?: string
  };
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  display_name?: string;
  email: string;
  avatar_url?: string;
  university?: string;
  faculty?: string;
  course?: number;
  role?: string;
}

interface Recommendation {
  id: number;
  from_user: {
    id: number;
    first_name: string;
    last_name: string;
    display_name?: string;
    avatar_url?: string;
    role?: string
  };
  opportunity_id: number;
  opportunity_title?: string;
  message?: string;
  is_read: boolean;
  created_at: string;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: { link?: string };
  is_read: boolean;
  created_at: string;
}

interface ContactsContext {
  user: any;
  refreshStats: () => void;
  refreshUnread: () => void;
  refreshNotifications: () => void;
  stats: any;
}

const ContactsPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { refreshStats, refreshNotifications } = useOutletContext<ContactsContext>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Contact[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<Contact[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'contacts' | 'requests' | 'recommendations' | 'search'>('contacts');
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<number | null>(null);
  const [acceptingRequest, setAcceptingRequest] = useState<number | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<number | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAllData();
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const response = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const response = await fetch('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        // Диспатчим событие для обновления счетчика в лайауте
        window.dispatchEvent(new Event('notificationsUpdated'));
        if (refreshNotifications) refreshNotifications();
        if (refreshStats) refreshStats();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        // Обновляем локальное состояние
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        );
        setUnreadCount(0);
        
        // Диспатчим события для обновления счетчика в лайауте и других компонентах
        window.dispatchEvent(new Event('notificationsUpdated'));
        
        // Обновляем статистику через контекст
        if (refreshNotifications) refreshNotifications();
        if (refreshStats) refreshStats();
        
        // Показываем уведомление об успешном прочтении
        console.log('✅ All notifications marked as read');
        
        // Опционально: показать всплывающее сообщение
        // alert('Все уведомления отмечены как прочитанные');
      } else {
        const error = await response.json().catch(() => null);
        console.error('Failed to mark all as read:', error);
        alert(error?.detail || 'Не удалось отметить все уведомления как прочитанные');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      alert('Ошибка сети. Попробуйте позже.');
    }
  };

  const fetchAllData = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      const [contactsRes, incomingRes, outgoingRes, recommendationsRes] = await Promise.all([
        fetch(`/api/contacts`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/contacts/requests`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/contacts/outgoing`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/contacts/recommendations`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data.items || []);
      }
      if (incomingRes.ok) {
        const data = await incomingRes.json();
        setIncomingRequests(data.items || []);
      }
      if (outgoingRes.ok) {
        const data = await outgoingRes.json();
        setOutgoingRequests(data.items || []);
      }
      if (recommendationsRes.ok) {
        const data = await recommendationsRes.json();
        const viewed = localStorage.getItem('viewed_recommendations');
        const viewedIds = viewed ? new Set(JSON.parse(viewed)) : new Set();
        const unviewedRecs = data.filter((rec: Recommendation) => !viewedIds.has(rec.id) && !rec.is_read);
        setRecommendations(unviewedRecs);
      }
    } catch (error) {
      console.error('Error fetching contacts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchStudents = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    const token = localStorage.getItem('access_token');

    try {
      const response = await fetch(`/users/students?search=${encodeURIComponent(searchQuery)}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.items || []);
        if (data.items?.length === 0) {
          setSearchError('По вашему запросу ничего не найдено');
        }
      } else if (response.status === 401) {
        setSearchError('Ошибка авторизации. Пожалуйста, войдите снова.');
      } else if (response.status === 404) {
        setSearchError('Эндпоинт поиска не найден. Проверьте настройки сервера.');
      } else {
        const errorData = await response.json().catch(() => null);
        setSearchError(errorData?.detail || `Ошибка поиска: ${response.status}`);
      }
    } catch (error) {
      console.error('Error searching students:', error);
      setSearchError('Ошибка сети. Проверьте подключение к серверу.');
    } finally {
      setSearchLoading(false);
    }
  };

  const sendContactRequest = async (userId: number) => {
    setSendingRequest(userId);
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`/api/contacts/${userId}/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setSearchResults(prev => prev.filter(s => s.id !== userId));
        const outgoingRes = await fetch(`/api/contacts/outgoing`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (outgoingRes.ok) {
          const data = await outgoingRes.json();
          setOutgoingRequests(data.items || []);
          if (refreshStats) refreshStats();
          window.dispatchEvent(new Event('contactsUpdated'));
        }
      } else {
        const error = await response.json();
        alert(error.detail || 'Не удалось отправить запрос');
      }
    } catch (error) {
      console.error('Error sending contact request:', error);
      alert('Ошибка сети');
    } finally {
      setSendingRequest(null);
    }
  };

  const acceptContactRequest = async (contactId: number) => {
    setAcceptingRequest(contactId);
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`/api/contacts/${contactId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const acceptedContact = incomingRequests.find(r => r.id === contactId);
        if (acceptedContact) {
          setContacts(prev => [...prev, acceptedContact]);
          setIncomingRequests(prev => prev.filter(r => r.id !== contactId));
          if (refreshStats) refreshStats();
          window.dispatchEvent(new Event('contactsUpdated'));
        }
      } else {
        const error = await response.json();
        alert(error.detail || 'Не удалось принять запрос');
      }
    } catch (error) {
      console.error('Error accepting contact request:', error);
      alert('Ошибка сети');
    } finally {
      setAcceptingRequest(null);
    }
  };

  const rejectContactRequest = async (contactId: number) => {
    setRejectingRequest(contactId);
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`/api/contacts/${contactId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setIncomingRequests(prev => prev.filter(r => r.id !== contactId));
        if (refreshStats) refreshStats();
        window.dispatchEvent(new Event('contactsUpdated'));
      } else {
        const error = await response.json();
        alert(error.detail || 'Не удалось отклонить запрос');
      }
    } catch (error) {
      console.error('Error rejecting contact request:', error);
      alert('Ошибка сети');
    } finally {
      setRejectingRequest(null);
    }
  };

  const markRecommendationAsRead = async (recommendationId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    try {
      const response = await fetch(`/api/contacts/recommendations/${recommendationId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setRecommendations(prev => prev.filter(r => r.id !== recommendationId));
        
        const viewed = localStorage.getItem('viewed_recommendations');
        const viewedIds = viewed ? new Set(JSON.parse(viewed)) : new Set();
        viewedIds.add(recommendationId);
        localStorage.setItem('viewed_recommendations', JSON.stringify(Array.from(viewedIds)));
        
        if (refreshStats) refreshStats();
        window.dispatchEvent(new Event('recommendationsUpdated'));
        window.dispatchEvent(new Event('viewedRecommendationsUpdated'));
      }
    } catch (error) {
      console.error('Error marking recommendation as read:', error);
    }
  };

  const getContactUser = (contact: Contact) => {
    if (contact.user.id !== currentUser?.id) {
      return contact.user;
    }
    return contact.contact;
  };

  const getUserDisplayName = (user: { first_name: string; last_name: string; display_name?: string }) => {
    if (user.display_name) return user.display_name;
    return `${user.first_name} ${user.last_name}`.trim();
  };

  const getInitials = (firstName: string, lastName: string) => {
    if (!firstName && !lastName) return '?';
    return (firstName?.[0] || '') + (lastName?.[0] || '');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchStudents();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markNotificationAsRead(notification.id);
    }
    if (notification.data?.link) {
      navigate(notification.data.link);
    }
    setShowNotifications(false);
  };

  if (loading) {
    return (
      <div className="student-contacts__loading">
        <div className="spinner"></div>
        <p>Загрузка контактов...</p>
      </div>
    );
  }

  const totalRequests = incomingRequests.length;

  return (
    <div className="student-contacts">
      <motion.div className="student-contacts__header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="student-contacts__header-left">
          <h1>Профессиональные контакты</h1>
          <p>Находите единомышленников и стройте профессиональную сеть</p>
        </div>
        <div className="student-contacts__header-right">
          <div className="student-contacts__notifications" ref={notificationsRef}>
            <button
              className="student-contacts__notifications-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell size={20} />
              {unreadCount > 0 && <span className="student-contacts__notifications-badge">{unreadCount}</span>}
            </button>
            {showNotifications && (
              <div className="student-contacts__notifications-dropdown">
                <div className="student-contacts__notifications-header">
                  <h4>Уведомления</h4>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllNotificationsAsRead} 
                      className="student-contacts__notifications-read-all"
                    >
                      Прочитать все
                    </button>
                  )}
                </div>
                <div className="student-contacts__notifications-list">
                  {notifications.length === 0 ? (
                    <p className="student-contacts__notifications-empty">Нет уведомлений</p>
                  ) : (
                    notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`student-contacts__notification-item ${!notification.is_read ? 'unread' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="student-contacts__notification-content">
                          <div className="student-contacts__notification-title">{notification.title}</div>
                          <div className="student-contacts__notification-message">{notification.message}</div>
                          <div className="student-contacts__notification-date">
                            {new Date(notification.created_at).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="student-contacts__tabs">
        <button className={`student-contacts__tab ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
          <Users size={18} /><span>Контакты</span>{contacts.length > 0 && <span className="student-contacts__tab-count">{contacts.length}</span>}
        </button>
        <button className={`student-contacts__tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          <UserPlus size={18} /><span>Запросы</span>{totalRequests > 0 && <span className="student-contacts__tab-count student-contacts__tab-count--new">{totalRequests}</span>}
        </button>
        <button className={`student-contacts__tab ${activeTab === 'recommendations' ? 'active' : ''}`} onClick={() => setActiveTab('recommendations')}>
          <Star size={18} /><span>Рекомендации</span>{recommendations.length > 0 && <span className="student-contacts__tab-count student-contacts__tab-count--new">{recommendations.length}</span>}
        </button>
        <button className={`student-contacts__tab ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
          <Search size={18} /><span>Поиск</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'contacts' && (
          <motion.div key="contacts" className="student-contacts__content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            {contacts.length === 0 ? (
              <div className="student-contacts__empty">
                <div className="student-contacts__empty-icon"><Users size={48} /></div>
                <h3>Нет контактов</h3>
                <p>Добавляйте других студентов в контакты, чтобы обмениваться опытом и рекомендациями</p>
                <button className="student-contacts__empty-btn" onClick={() => setActiveTab('search')}>Найти студентов</button>
              </div>
            ) : (
              <div className="student-contacts__grid">
                {contacts.map(contact => {
                  const user = getContactUser(contact);
                  return (
                    <div key={contact.id} className="student-contacts__card">
                      <div className="student-contacts__card-avatar">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={getUserDisplayName(user)} />
                        ) : (
                          <div className="student-contacts__card-avatar-placeholder">
                            {getInitials(user.first_name, user.last_name)}
                          </div>
                        )}
                      </div>
                      <div className="student-contacts__card-info">
                        <h4>{getUserDisplayName(user)}</h4>
                        <p className="student-contacts__card-university">{user.university || 'Студент'}</p>
                      </div>
                      <div className="student-contacts__card-actions">
                        <button
                          className="student-contacts__card-action"
                          onClick={() => navigate(`/student/chat/${user.id}`)}
                          title="Написать сообщение"
                        >
                          <MessageCircle size={18} />
                        </button>
                        <button
                          className="student-contacts__card-action student-contacts__card-action--recommend"
                          onClick={() => navigate(`/student/recommend/${user.id}`)}
                          title="Рекомендовать на вакансию"
                        >
                          <Briefcase size={18} />
                        </button>
                        <button
                          className="student-contacts__card-action student-contacts__card-action--profile"
                          onClick={() => navigate(`/student/user/${user.id}`)}
                          title="Просмотреть профиль"
                        >
                          <User size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'requests' && (
          <motion.div key="requests" className="student-contacts__content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="student-contacts__requests-section">
              <h3>Входящие запросы</h3>
              {incomingRequests.length === 0 ? (
                <div className="student-contacts__empty-small"><p>Нет входящих запросов</p></div>
              ) : (
                <div className="student-contacts__requests-list">
                  {incomingRequests.map(request => {
                    const user = getContactUser(request);
                    return (
                      <div key={request.id} className="student-contacts__request-card">
                        <div className="student-contacts__request-avatar">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={getUserDisplayName(user)} />
                          ) : (
                            <div className="student-contacts__request-avatar-placeholder">
                              {getInitials(user.first_name, user.last_name)}
                            </div>
                          )}
                        </div>
                        <div className="student-contacts__request-info">
                          <h4>{getUserDisplayName(user)}</h4>
                          <p className="student-contacts__request-university">{user.university || 'Студент'}</p>
                          <p className="student-contacts__request-date"><Clock size={12} />{new Date(request.created_at).toLocaleDateString('ru-RU')}</p>
                        </div>
                        <div className="student-contacts__request-actions">
                          <button
                            className="student-contacts__request-accept"
                            onClick={() => acceptContactRequest(request.id)}
                            disabled={acceptingRequest === request.id}
                          >
                            {acceptingRequest === request.id ? <div className="spinner-small"></div> : <Check size={18} />}
                          </button>
                          <button
                            className="student-contacts__request-reject"
                            onClick={() => rejectContactRequest(request.id)}
                            disabled={rejectingRequest === request.id}
                          >
                            {rejectingRequest === request.id ? <div className="spinner-small"></div> : <X size={18} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="student-contacts__requests-section">
              <h3>Исходящие запросы</h3>
              {outgoingRequests.length === 0 ? (
                <div className="student-contacts__empty-small"><p>Нет исходящих запросов</p></div>
              ) : (
                <div className="student-contacts__requests-list">
                  {outgoingRequests.map(request => {
                    const user = getContactUser(request);
                    return (
                      <div key={request.id} className="student-contacts__request-card student-contacts__request-card--outgoing">
                        <div className="student-contacts__request-avatar">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={getUserDisplayName(user)} />
                          ) : (
                            <div className="student-contacts__request-avatar-placeholder">
                              {getInitials(user.first_name, user.last_name)}
                            </div>
                          )}
                        </div>
                        <div className="student-contacts__request-info">
                          <h4>{getUserDisplayName(user)}</h4>
                          <p className="student-contacts__request-university">{user.university || 'Студент'}</p>
                          <div className="student-contacts__request-status-pending">
                            <Clock size={12} />
                            <span>Ожидает ответа</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'recommendations' && (
          <motion.div key="recommendations" className="student-contacts__content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            {recommendations.length === 0 ? (
              <div className="student-contacts__empty">
                <div className="student-contacts__empty-icon"><Star size={48} /></div>
                <h3>Нет рекомендаций</h3>
                <p>Когда ваши контакты порекомендуют вас на вакансию, уведомления появятся здесь</p>
              </div>
            ) : (
              <div className="student-contacts__recommendations-list">
                {recommendations.map(rec => (
                  <div key={rec.id} className={`student-contacts__recommendation-card ${!rec.is_read ? 'unread' : ''}`}>
                    <div className="student-contacts__recommendation-avatar">
                      {rec.from_user.avatar_url ? (
                        <img src={rec.from_user.avatar_url} alt={getUserDisplayName(rec.from_user)} />
                      ) : (
                        <div className="student-contacts__recommendation-avatar-placeholder">
                          {getInitials(rec.from_user.first_name, rec.from_user.last_name)}
                        </div>
                      )}
                    </div>
                    <div className="student-contacts__recommendation-content">
                      <div className="student-contacts__recommendation-header">
                        <strong>{getUserDisplayName(rec.from_user)}</strong>
                        <span>рекомендует вас на вакансию</span>
                      </div>
                      <button
                        className="student-contacts__recommendation-opportunity"
                        onClick={() => {
                          markRecommendationAsRead(rec.id);
                          navigate(`/student/opportunities`, { state: { openOpportunityId: rec.opportunity_id } });
                        }}
                      >
                        {rec.opportunity_title || 'Перейти к вакансии'}
                      </button>
                      {rec.message && <p className="student-contacts__recommendation-message">"{rec.message}"</p>}
                      <p className="student-contacts__recommendation-date">
                        {new Date(rec.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'search' && (
          <motion.div key="search" className="student-contacts__content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="student-contacts__search-form">
              <form onSubmit={handleSearch}>
                <div className="student-contacts__search-input">
                  <Search size={20} />
                  <input
                    type="text"
                    placeholder="Поиск по имени, университету, факультету..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchError(null);
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="student-contacts__search-clear"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        setSearchError(null);
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button type="submit" className="student-contacts__search-btn" disabled={searchLoading}>
                  {searchLoading ? <div className="spinner-small"></div> : 'Найти'}
                </button>
              </form>
            </div>

            {searchError && (
              <div className="student-contacts__search-error">
                <X size={20} />
                <span>{searchError}</span>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="student-contacts__search-results">
                <h3>Результаты поиска ({searchResults.length})</h3>
                <div className="student-contacts__grid">
                  {searchResults.map(student => (
                    <div key={student.id} className="student-contacts__card">
                      <div className="student-contacts__card-avatar">
                        {student.avatar_url ? (
                          <img src={student.avatar_url} alt={getUserDisplayName(student)} />
                        ) : (
                          <div className="student-contacts__card-avatar-placeholder">
                            {getInitials(student.first_name, student.last_name)}
                          </div>
                        )}
                      </div>
                      <div className="student-contacts__card-info">
                        <h4>{getUserDisplayName(student)}</h4>
                        <p className="student-contacts__card-university">
                          {student.university || 'Университет не указан'}
                          {student.course && ` • ${student.course} курс`}
                        </p>
                        {student.faculty && <p className="student-contacts__card-faculty">{student.faculty}</p>}
                      </div>
                      <button
                        className="student-contacts__card-add"
                        onClick={() => sendContactRequest(student.id)}
                        disabled={sendingRequest === student.id}
                      >
                        {sendingRequest === student.id ? (
                          <div className="spinner-small"></div>
                        ) : (
                          <>
                            <UserPlus size={16} />
                            <span>Добавить</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {searchQuery && searchResults.length === 0 && !searchLoading && !searchError && (
              <div className="student-contacts__empty">
                <div className="student-contacts__empty-icon"><Search size={48} /></div>
                <h3>Ничего не найдено</h3>
                <p>Попробуйте изменить поисковый запрос</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContactsPage;