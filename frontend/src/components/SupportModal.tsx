// frontend/src/components/SupportModal.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TicketCreate {
  category: 'technical' | 'account' | 'verification' | 'moderation' | 'other';
  subject: string;
  message: string;
}

const SupportModal = ({ isOpen, onClose }: SupportModalProps) => {
  const [category, setCategory] = useState<TicketCreate['category']>('other');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: 'technical', label: 'Техническая проблема', icon: AlertCircle },
    { value: 'account', label: 'Вопросы по аккаунту', icon: HelpCircle },
    { value: 'verification', label: 'Верификация', icon: CheckCircle },
    { value: 'moderation', label: 'Модерация', icon: AlertCircle },
    { value: 'other', label: 'Другое', icon: HelpCircle },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Не авторизован');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          subject,
          message,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          setCategory('other');
          setSubject('');
          setMessage('');
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Ошибка при отправке обращения');
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="support-modal__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="support-modal__content"
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            onClick={e => e.stopPropagation()}
          >
            <button className="support-modal__close" onClick={onClose}>
              <X size={20} />
            </button>

            <div className="support-modal__header">
              <HelpCircle size={28} />
              <h2>Служба поддержки</h2>
              <p>Опишите вашу проблему, и мы ответим в ближайшее время</p>
            </div>

            {success ? (
              <motion.div
                className="support-modal__success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <CheckCircle size={48} />
                <h3>Обращение отправлено!</h3>
                <p>Мы свяжемся с вами в ближайшее время</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="support-modal__form">
                <div className="support-modal__field">
                  <label>Категория обращения</label>
                  <div className="support-modal__categories">
                    {categories.map(cat => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          className={`support-modal__category-btn ${
                            category === cat.value ? 'active' : ''
                          }`}
                          onClick={() => setCategory(cat.value as TicketCreate['category'])}
                        >
                          <Icon size={16} />
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="support-modal__field">
                  <label>Тема</label>
                  <input
                    type="text"
                    placeholder="Кратко опишите суть вопроса"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div className="support-modal__field">
                  <label>Сообщение</label>
                  <textarea
                    placeholder="Подробно опишите вашу проблему или вопрос"
                    rows={5}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="support-modal__error">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="support-modal__actions">
                  <button type="button" className="support-modal__cancel" onClick={onClose}>
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="support-modal__submit"
                    disabled={loading || !subject || !message}
                  >
                    {loading ? (
                      <>
                        <div className="spinner-small"></div>
                        <span>Отправка...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Отправить</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SupportModal;