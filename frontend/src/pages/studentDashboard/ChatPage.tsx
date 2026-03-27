// frontend/src/pages/studentDashboard/ChatPage.tsx
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Send, ArrowLeft, Check, CheckCheck, Users, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Conversation {
  user: { 
    id: number; 
    first_name: string;
    last_name: string;
    display_name?: string | null;
    avatar_url?: string | null;
    university?: string;
    role?: string;
  };
  last_message: string;
  last_message_at: string;
  unread_count: number;
  opportunity_id?: number;
}

interface Message {
  id: number;
  sender: { 
    id: number; 
    first_name: string;
    last_name: string;
    display_name?: string | null;
    role?: string;
  };
  receiver: { 
    id: number; 
    first_name: string;
    last_name: string;
    display_name?: string | null;
    role?: string;
  };
  message: string;
  is_read: boolean;
  created_at: string;
  opportunity_id?: number;
}

interface Contact {
  id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    display_name?: string | null;
    avatar_url?: string | null;
    university?: string;
  };
  contact: {
    id: number;
    first_name: string;
    last_name: string;
    display_name?: string | null;
    avatar_url?: string | null;
    university?: string;
  };
  status: string;
}

const ChatPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedUser, setSelectedUser] = useState<Conversation['user'] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContactsList, setShowContactsList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Функция для обновления счетчика непрочитанных сообщений
  const updateUnreadCount = () => {
    window.dispatchEvent(new Event('unreadMessagesUpdated'));
  };

  // Функция для получения отображаемого имени пользователя
  const getUserDisplayName = (user: { 
    first_name?: string; 
    last_name?: string;
    display_name?: string | null;
  }) => {
    if (user.display_name) {
      return user.display_name;
    }
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) {
      return user.first_name;
    }
    if (user.last_name) {
      return user.last_name;
    }
    return 'Пользователь';
  };

  // Функция для получения инициалов пользователя
  const getUserInitials = (user: { 
    first_name?: string; 
    last_name?: string;
    display_name?: string | null;
  }) => {
    if (user.display_name) {
      return user.display_name[0].toUpperCase();
    }
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) {
      return user.first_name[0].toUpperCase();
    }
    if (user.last_name) {
      return user.last_name[0].toUpperCase();
    }
    return '?';
  };

  useEffect(() => {
    fetchConversations();
    fetchContacts();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id);
      const interval = setInterval(() => {
        fetchMessages(selectedUser.id);
        updateUnreadCount();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (userId && !loading) {
      const userIdNum = parseInt(userId);
      const userFromConversation = conversations.find(
        conv => conv.user.id === userIdNum
      );
      if (userFromConversation) {
        setSelectedUser(userFromConversation.user);
      } else {
        fetchUserAndStartChat(userIdNum);
      }
    }
  }, [userId, conversations, loading]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Автофокус на поле ввода при выборе пользователя
    if (selectedUser && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchContacts = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    try {
      const response = await fetch('/api/contacts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setContacts(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchUserAndStartChat = async (targetUserId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    try {
      const response = await fetch(`/users/${targetUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const userData = await response.json();
        setSelectedUser({
          id: userData.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          display_name: userData.display_name,
          avatar_url: userData.avatar_url,
          university: userData.university,
          role: userData.role,
        });
      } else if (response.status === 404) {
        const contact = contacts.find(c => 
          c.user.id === targetUserId || c.contact.id === targetUserId
        );
        if (contact) {
          const contactUser = contact.user.id === currentUser?.id ? contact.contact : contact.user;
          setSelectedUser({
            id: contactUser.id,
            first_name: contactUser.first_name,
            last_name: contactUser.last_name,
            display_name: contactUser.display_name,
            avatar_url: contactUser.avatar_url,
            university: contactUser.university,
          });
        } else {
          setError('Пользователь не найден');
          setTimeout(() => setError(null), 3000);
        }
      } else {
        setError('Не удалось загрузить информацию о пользователе');
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setError('Не удалось загрузить информацию о пользователе');
      setTimeout(() => setError(null), 3000);
    }
  };

  const fetchConversations = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/api/chat/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Conversations data:', data);
        setConversations(data);
        setError(null);
      } else if (response.status === 401) {
        console.error('Unauthorized');
        setError('Ошибка авторизации. Пожалуйста, войдите снова.');
      } else {
        console.error('Failed to fetch conversations:', response.status);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Ошибка сети. Проверьте подключение.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (targetUserId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/chat/with/${targetUserId}?per_page=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        setError(null);
      } else {
        console.error('Failed to fetch messages:', response.status);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || sending) return;
    
    setSending(true);
    const token = localStorage.getItem('access_token');
    if (!token) {
      setSending(false);
      return;
    }
    
    const payload = {
      receiver_id: selectedUser.id,
      message: newMessage.trim(),
    };
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        const sentMessage = await response.json();
        setMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
        fetchConversations();
        scrollToBottom();
        updateUnreadCount();
        window.dispatchEvent(new Event('unreadMessagesUpdated'));
        // Добавляем обновление уведомлений
        setTimeout(() => {
          window.dispatchEvent(new Event('notificationsUpdated'));
        }, 500);
      } else {
        const errorData = await response.json().catch(() => null);
        if (errorData?.detail) {
          alert(`Ошибка: ${errorData.detail}`);
        } else {
          alert(`Ошибка ${response.status}: ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Ошибка сети. Проверьте подключение.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} дн назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getContactUser = (contact: Contact) => {
    if (contact.user.id === currentUser?.id) {
      return contact.contact;
    }
    return contact.user;
  };

  const startChatWithContact = (contact: Contact) => {
    const contactUser = getContactUser(contact);
    setSelectedUser({
      id: contactUser.id,
      first_name: contactUser.first_name,
      last_name: contactUser.last_name,
      display_name: contactUser.display_name,
      avatar_url: contactUser.avatar_url,
      university: contactUser.university,
    });
    setShowContactsList(false);
    navigate(`/student/chat/${contactUser.id}`);
  };

  const availableContacts = contacts.filter(contact => {
    const contactUser = getContactUser(contact);
    return !conversations.some(conv => conv.user.id === contactUser.id);
  });

  if (loading) {
    return (
      <div className="chat-page__loading">
        <div className="spinner"></div>
        <p>Загрузка диалогов...</p>
      </div>
    );
  }

  return (
    <div className="chat-page">
      {error && (
        <div className="chat-page__error">
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      <motion.div 
        className="chat-page__container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Sidebar */}
        <div className="chat-page__sidebar">
          <div className="chat-page__sidebar-header">
            <h2>Сообщения</h2>
            <div className="chat-page__sidebar-header-actions">
              <p>{conversations.length} диалогов</p>
              {contacts.length > 0 && (
                <button 
                  className="chat-page__new-chat-btn"
                  onClick={() => setShowContactsList(!showContactsList)}
                  title="Начать новый диалог"
                >
                  <Plus size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Модальное окно выбора контакта для нового диалога */}
          {showContactsList && (
            <>
              <div className="chat-page__contacts-overlay" onClick={() => setShowContactsList(false)} />
              <div className="chat-page__contacts-modal">
                <div className="chat-page__contacts-modal-header">
                  <h4>Выберите контакт</h4>
                  <button onClick={() => setShowContactsList(false)}>×</button>
                </div>
                <div className="chat-page__contacts-list">
                  {availableContacts.length === 0 ? (
                    <p className="chat-page__contacts-empty">
                      Все контакты уже имеют диалоги
                    </p>
                  ) : (
                    availableContacts.map(contact => {
                      const contactUser = getContactUser(contact);
                      return (
                        <div
                          key={contact.id}
                          className="chat-page__contact-item"
                          onClick={() => startChatWithContact(contact)}
                        >
                          <div className="chat-page__contact-avatar">
                            {contactUser.avatar_url ? (
                              <img src={contactUser.avatar_url} alt={getUserDisplayName(contactUser)} />
                            ) : (
                              <div className="chat-page__contact-avatar-placeholder">
                                {getUserInitials(contactUser)}
                              </div>
                            )}
                          </div>
                          <div className="chat-page__contact-info">
                            <span className="chat-page__contact-name">
                              {getUserDisplayName(contactUser)}
                            </span>
                            {contactUser.university && (
                              <span className="chat-page__contact-university">
                                {contactUser.university}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          <div className="chat-page__conversations">
            {conversations.length === 0 && contacts.length === 0 ? (
              <div className="chat-page__empty-conversations">
                <MessageCircle size={48} />
                <p>Нет диалогов</p>
                <span>Добавьте контакты, чтобы начать общение</span>
                <button onClick={() => navigate('/student/contacts')}>
                  Найти контакты
                </button>
              </div>
            ) : conversations.length === 0 ? (
              <div className="chat-page__empty-conversations">
                <Users size={48} />
                <p>Нет активных диалогов</p>
                <span>У вас есть {contacts.length} контактов</span>
                <button onClick={() => setShowContactsList(true)}>
                  Начать диалог
                </button>
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.user.id}
                  className={`chat-page__conversation ${selectedUser?.id === conv.user.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedUser(conv.user);
                    navigate(`/student/chat/${conv.user.id}`);
                  }}
                >
                  <div className="chat-page__conversation-avatar">
                    {conv.user.avatar_url ? (
                      <img src={conv.user.avatar_url} alt={getUserDisplayName(conv.user)} />
                    ) : (
                      <div className="chat-page__conversation-avatar-placeholder">
                        {getUserInitials(conv.user)}
                      </div>
                    )}
                  </div>
                  <div className="chat-page__conversation-info">
                    <div className="chat-page__conversation-name">
                      {getUserDisplayName(conv.user)}
                    </div>
                    <div className="chat-page__conversation-last-message">
                      {conv.last_message?.substring(0, 40)}
                      {conv.last_message?.length > 40 ? '...' : ''}
                    </div>
                  </div>
                  <div className="chat-page__conversation-meta">
                    <div className="chat-page__conversation-time">
                      {formatTime(conv.last_message_at)}
                    </div>
                    {conv.unread_count > 0 && (
                      <div className="chat-page__unread-badge">
                        {conv.unread_count}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-page__main">
          {selectedUser ? (
            <>
              <div className="chat-page__header">
                <button 
                  className="chat-page__back-btn" 
                  onClick={() => {
                    setSelectedUser(null);
                    navigate('/student/chat');
                  }}
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="chat-page__header-avatar">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt={getUserDisplayName(selectedUser)} />
                  ) : (
                    <div className="chat-page__header-avatar-placeholder">
                      {getUserInitials(selectedUser)}
                    </div>
                  )}
                </div>
                <div className="chat-page__header-info">
                  <h3>{getUserDisplayName(selectedUser)}</h3>
                  {selectedUser.university && (
                    <p>{selectedUser.university}</p>
                  )}
                </div>
              </div>

              <div className="chat-page__messages">
                {loadingMessages ? (
                  <div className="chat-page__loading-messages">
                    <div className="spinner-small"></div>
                    <span>Загрузка сообщений...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-page__empty-messages">
                    <MessageCircle size={48} />
                    <p>Начните диалог</p>
                    <span>Напишите первое сообщение</span>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isSent = msg.sender.id === currentUser?.id;
                    return (
                      <div key={msg.id} className={`chat-page__message ${isSent ? 'sent' : 'received'}`}>
                        <div className="chat-page__message-bubble">
                          <div className="chat-page__message-text">{msg.message}</div>
                          <div className="chat-page__message-meta">
                            <span className="chat-page__message-time">
                              {formatMessageTime(msg.created_at)}
                            </span>
                            {isSent && (
                              <span className="chat-page__message-status">
                                {msg.is_read ? (
                                  <CheckCheck size={14} />
                                ) : (
                                  <Check size={14} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-page__input-area">
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Введите сообщение..."
                  rows={1}
                />
                <button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim() || sending}
                  className={sending ? 'sending' : ''}
                >
                  {sending ? <div className="spinner-small"></div> : <Send size={20} />}
                </button>
              </div>
            </>
          ) : (
            <div className="chat-page__no-selection">
              <MessageCircle size={64} />
              <h3>Выберите диалог</h3>
              <p>Начните общение с другими студентами или представителями компаний</p>
              {contacts.length > 0 ? (
                <button onClick={() => setShowContactsList(true)}>
                  Начать новый диалог
                </button>
              ) : (
                <button onClick={() => navigate('/student/contacts')}>
                  Найти контакты
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ChatPage;