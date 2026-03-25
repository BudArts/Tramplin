// frontend/src/pages/studentDashboard/RecommendationPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Send, ArrowLeft, Briefcase, MessageCircle, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Opportunity {
  id: number;
  title: string;
  company_name?: string;
}

interface Contact {
  id: number;
  user: { id: number; first_name: string; last_name: string; avatar_url?: string };
  contact: { id: number; first_name: string; last_name: string; avatar_url?: string };
}

const RecommendationPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [contact, setContact] = useState<Contact | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (userId) fetchContactAndOpportunities();
  }, [userId]);

  const fetchContactAndOpportunities = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const contactsRes = await fetch(`/api/contacts`, { headers: { Authorization: `Bearer ${token}` } });
      if (contactsRes.ok) {
        const contacts = await contactsRes.json();
        const foundContact = contacts.items?.find((c: Contact) => c.user.id === parseInt(userId!) || c.contact.id === parseInt(userId!));
        if (foundContact) setContact(foundContact);
      }
      const oppRes = await fetch(`/api/opportunities?status=active&per_page=50`, { headers: { Authorization: `Bearer ${token}` } });
      if (oppRes.ok) {
        const data = await oppRes.json();
        setOpportunities(data.items || []);
      }
    } catch (error) { console.error('Error fetching data:', error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpportunity) return;
    setSubmitting(true);
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`/api/contacts/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to_user_id: parseInt(userId!), opportunity_id: selectedOpportunity, message: message || null }),
      });
      if (response.ok) { setSuccess(true); setTimeout(() => navigate('/student/contacts'), 2000); }
      else { alert('Ошибка при отправке рекомендации'); }
    } catch (error) { console.error('Error submitting recommendation:', error); alert('Ошибка сети'); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="student-recommendation__loading">
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="student-recommendation__error">
        <div className="student-recommendation__error-icon"><X size={48} /></div>
        <h3>Контакт не найден</h3>
        <p>Пользователь не является вашим контактом</p>
        <button onClick={() => navigate('/student/contacts')} className="student-recommendation__back-btn"><ArrowLeft size={18} />Вернуться к контактам</button>
      </div>
    );
  }

  const contactUser = contact.user.id !== currentUser?.id ? contact.user : contact.contact;

  return (
    <div className="student-recommendation">
      <motion.div className="student-recommendation__header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <button className="student-recommendation__back" onClick={() => navigate('/student/contacts')}><ArrowLeft size={20} /><span>Назад</span></button>
        <h1>Рекомендовать на вакансию</h1>
      </motion.div>

      {success ? (
        <motion.div className="student-recommendation__success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="student-recommendation__success-icon"><Star size={48} /></div>
          <h2>Рекомендация отправлена!</h2>
          <p>{contactUser.first_name} {contactUser.last_name} получит уведомление</p>
        </motion.div>
      ) : (
        <motion.form className="student-recommendation__form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} onSubmit={handleSubmit}>
          <div className="student-recommendation__contact">
            <div className="student-recommendation__contact-avatar">
              {contactUser.avatar_url ? <img src={contactUser.avatar_url} alt={contactUser.first_name} /> : <div className="student-recommendation__contact-avatar-placeholder">{contactUser.first_name?.[0]}{contactUser.last_name?.[0]}</div>}
            </div>
            <div className="student-recommendation__contact-info"><h3>{contactUser.first_name} {contactUser.last_name}</h3><p>Ваш контакт</p></div>
          </div>

          <div className="student-recommendation__field">
            <label><Briefcase size={18} /><span>Выберите вакансию или стажировку</span></label>
            <div className="student-recommendation__opportunities">
              {opportunities.map(opp => (
                <button key={opp.id} type="button" className={`student-recommendation__opportunity ${selectedOpportunity === opp.id ? 'selected' : ''}`} onClick={() => setSelectedOpportunity(opp.id)}>
                  <div className="student-recommendation__opportunity-title">{opp.title}</div>
                  <div className="student-recommendation__opportunity-company">{opp.company_name || 'Компания'}</div>
                </button>
              ))}
              {opportunities.length === 0 && <p className="student-recommendation__no-opportunities">Нет доступных вакансий для рекомендации</p>}
            </div>
          </div>

          <div className="student-recommendation__field">
            <label><MessageCircle size={18} /><span>Сопроводительное сообщение (необязательно)</span></label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Почему вы рекомендуете этого кандидата?" rows={4} />
          </div>

          <div className="student-recommendation__actions">
            <button type="button" className="student-recommendation__cancel" onClick={() => navigate('/student/contacts')}>Отмена</button>
            <button type="submit" className="student-recommendation__submit" disabled={!selectedOpportunity || submitting}>
              {submitting ? <div className="spinner-small"></div> : <><Send size={18} /><span>Отправить рекомендацию</span></>}
            </button>
          </div>
        </motion.form>
      )}
    </div>
  );
};

export default RecommendationPage;