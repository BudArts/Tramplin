// frontend/src/pages/studentDashboard/RecommendationPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Send, ArrowLeft, Briefcase, MessageCircle, Users, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Opportunity {
  id: number;
  title: string;
  company_name?: string;
  company?: { name: string };
}

interface Contact {
  id: number;
  user: { id: number; first_name: string; last_name: string; display_name?: string; avatar_url?: string; university?: string };
  contact: { id: number; first_name: string; last_name: string; display_name?: string; avatar_url?: string; university?: string };
}

interface Recommendation {
  id: number;
  from_user: { id: number; first_name: string; last_name: string };
  opportunity_id: number;
  is_read: boolean;
}

const RecommendationPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const opportunityIdFromUrl = searchParams.get('opportunityId');
  const modeFromUrl = searchParams.get('mode');
  
  const { user: currentUser } = useAuth();
  const [contact, setContact] = useState<Contact | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<number | null>(
    opportunityIdFromUrl ? parseInt(opportunityIdFromUrl) : null
  );
  const [selectedContact, setSelectedContact] = useState<number | null>(
    userId ? parseInt(userId) : null
  );
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState<'to-friend' | 'to-opportunity'>(
    modeFromUrl === 'to-opportunity' ? 'to-opportunity' : 'to-friend'
  );

  useEffect(() => {
    if (modeFromUrl === 'to-opportunity') {
      setMode('to-opportunity');
    } else {
      setMode('to-friend');
    }
  }, [modeFromUrl]);

  useEffect(() => {
    if (userId) {
      fetchContactAndOpportunities();
    } else if (opportunityIdFromUrl) {
      fetchContactsAndOpportunities();
    } else {
      fetchAllData();
    }
    fetchRecommendations();
  }, [userId, opportunityIdFromUrl]);

  const fetchRecommendations = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    try {
      const response = await fetch('/api/contacts/recommendations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const markAllRecommendationsAsRead = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    try {
      const unreadRecs = recommendations.filter(r => !r.is_read);
      if (unreadRecs.length > 0) {
        await fetch('/api/contacts/recommendations/read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ recommendation_ids: unreadRecs.map(r => r.id) }),
        });
        
        const viewed = localStorage.getItem('viewed_recommendations');
        const viewedIds = viewed ? new Set(JSON.parse(viewed)) : new Set();
        unreadRecs.forEach(rec => viewedIds.add(rec.id));
        localStorage.setItem('viewed_recommendations', JSON.stringify(Array.from(viewedIds)));
        
        window.dispatchEvent(new Event('viewedRecommendationsUpdated'));
        window.dispatchEvent(new Event('recommendationsUpdated'));
      }
    } catch (error) {
      console.error('Error marking recommendations as read:', error);
    }
  };

  const fetchAllData = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const [oppRes, contactsRes] = await Promise.all([
        fetch(`/api/opportunities?status=active&per_page=50`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/contacts`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      if (oppRes.ok) {
        const data = await oppRes.json();
        setOpportunities(data.items || []);
      }
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContactAndOpportunities = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const [contactsRes, oppRes] = await Promise.all([
        fetch(`/api/contacts`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/opportunities?status=active&per_page=50`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        const foundContact = contactsData.items?.find((c: Contact) => 
          c.user.id === parseInt(userId!) || c.contact.id === parseInt(userId!)
        );
        if (foundContact) setContact(foundContact);
        setContacts(contactsData.items || []);
      }
      if (oppRes.ok) {
        const data = await oppRes.json();
        setOpportunities(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContactsAndOpportunities = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const [contactsRes, oppRes] = await Promise.all([
        fetch(`/api/contacts`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/opportunities?status=active&per_page=50`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data.items || []);
      }
      if (oppRes.ok) {
        const data = await oppRes.json();
        setOpportunities(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let toUserId: number | null = null;
    let opportunityIdToSend: number | null = null;
    
    if (mode === 'to-friend') {
      if (!selectedContact) {
        alert('Пожалуйста, выберите друга');
        return;
      }
      if (!selectedOpportunity) {
        alert('Пожалуйста, выберите вакансию');
        return;
      }
      toUserId = selectedContact;
      opportunityIdToSend = selectedOpportunity;
    } else {
      if (!selectedContact) {
        alert('Пожалуйста, выберите друга');
        return;
      }
      if (!selectedOpportunity) {
        alert('Пожалуйста, выберите вакансию');
        return;
      }
      toUserId = selectedContact;
      opportunityIdToSend = selectedOpportunity;
    }
    
    setSubmitting(true);
    const token = localStorage.getItem('access_token');
    
    try {
      const payload = {
        to_user_id: toUserId,
        opportunity_id: opportunityIdToSend,
        message: message || null
      };
      
      const response = await fetch(`/api/contacts/recommend`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/student/contacts'), 2000);
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при отправке рекомендации');
      }
    } catch (error) {
      console.error('Error submitting recommendation:', error);
      alert('Ошибка сети');
    } finally {
      setSubmitting(false);
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

  const getOpportunityTitle = (opp: Opportunity) => {
    return opp.title;
  };

  const getOpportunityCompany = (opp: Opportunity) => {
    return opp.company_name || opp.company?.name || 'Компания';
  };

  useEffect(() => {
    if (recommendations.length > 0) {
      markAllRecommendationsAsRead();
    }
  }, [recommendations]);

  if (loading) {
    return (
      <div className="student-recommendation__loading">
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="student-recommendation">
      <motion.div className="student-recommendation__header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <button className="student-recommendation__back" onClick={() => navigate('/student/contacts')}>
          <ArrowLeft size={20} />
          <span>Назад</span>
        </button>
        <h1>
          {mode === 'to-friend' 
            ? 'Рекомендовать возможность другу' 
            : 'Рекомендовать друга на вакансию'}
        </h1>
        <p>
          {mode === 'to-friend'
            ? 'Порекомендуйте вакансию или стажировку своему контакту'
            : 'Порекомендуйте своего друга на подходящую вакансию'}
        </p>
      </motion.div>

      {success ? (
        <motion.div className="student-recommendation__success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="student-recommendation__success-icon"><Star size={48} /></div>
          <h2>Рекомендация отправлена!</h2>
          <p>Уведомление отправлено получателю</p>
          <button onClick={() => navigate('/student/contacts')}>Вернуться к контактам</button>
        </motion.div>
      ) : (
        <motion.form className="student-recommendation__form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} onSubmit={handleSubmit}>
          
          <div className="student-recommendation__field">
            <label><Users size={18} /><span>Выберите друга</span></label>
            <div className="student-recommendation__contacts">
              {contacts.map(contact => {
                const contactUser = getContactUser(contact);
                const isSelected = selectedContact === contactUser.id;
                return (
                  <button
                    key={contact.id}
                    type="button"
                    className={`student-recommendation__contact ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedContact(contactUser.id)}
                  >
                    <div className="student-recommendation__contact-avatar">
                      {contactUser.avatar_url ? (
                        <img src={contactUser.avatar_url} alt={getUserDisplayName(contactUser)} />
                      ) : (
                        <div className="student-recommendation__contact-avatar-placeholder">
                          {contactUser.first_name?.[0]}{contactUser.last_name?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="student-recommendation__contact-info">
                      <h4>{getUserDisplayName(contactUser)}</h4>
                      <p>{contactUser.university || 'Студент'}</p>
                    </div>
                    {isSelected && (
                      <div className="student-recommendation__contact-check">
                        <Check size={16} />
                      </div>
                    )}
                  </button>
                );
              })}
              {contacts.length === 0 && (
                <p className="student-recommendation__no-contacts">
                  У вас пока нет контактов. Добавьте друзей, чтобы рекомендовать им возможности.
                </p>
              )}
            </div>
          </div>

          <div className="student-recommendation__field">
            <label><Briefcase size={18} /><span>Выберите вакансию или стажировку</span></label>
            <div className="student-recommendation__opportunities">
              {opportunities.map(opp => {
                const isSelected = selectedOpportunity === opp.id;
                return (
                  <button
                    key={opp.id}
                    type="button"
                    className={`student-recommendation__opportunity ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedOpportunity(opp.id)}
                  >
                    <div>
                      <div className="student-recommendation__opportunity-title">{getOpportunityTitle(opp)}</div>
                      <div className="student-recommendation__opportunity-company">{getOpportunityCompany(opp)}</div>
                    </div>
                    {isSelected && (
                      <div className="student-recommendation__opportunity-check">
                        <Check size={14} />
                      </div>
                    )}
                  </button>
                );
              })}
              {opportunities.length === 0 && (
                <p className="student-recommendation__no-opportunities">Нет доступных вакансий для рекомендации</p>
              )}
            </div>
          </div>

          <div className="student-recommendation__field">
            <label><MessageCircle size={18} /><span>Сопроводительное сообщение (необязательно)</span></label>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Почему вы рекомендуете эту возможность? Что делает этого кандидата подходящим?"
              rows={4} 
            />
          </div>

          <div className="student-recommendation__actions">
            <button type="button" className="student-recommendation__cancel" onClick={() => navigate('/student/contacts')}>
              Отмена
            </button>
            <button 
              type="submit" 
              className="student-recommendation__submit" 
              disabled={
                !selectedContact || 
                !selectedOpportunity || 
                submitting
              }
            >
              {submitting ? (
                <>
                  <div className="spinner-small"></div>
                  <span>Отправка...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Отправить рекомендацию</span>
                </>
              )}
            </button>
          </div>
        </motion.form>
      )}
    </div>
  );
};

export default RecommendationPage;