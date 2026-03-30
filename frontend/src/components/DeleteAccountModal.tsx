// frontend/src/components/DeleteAccountModal.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

const DeleteAccountModal = ({ isOpen, onClose, onDeleted }: DeleteAccountModalProps) => {
  const { logout, user } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmText !== 'УДАЛИТЬ') {
      setError('Введите "УДАЛИТЬ" для подтверждения');
      return;
    }

    setLoading(true);
    setError(null);

    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Не авторизован');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/users/me', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Очищаем локальное хранилище
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // Вызываем логаут
        logout();
        
        // Уведомляем о завершении
        if (onDeleted) onDeleted();
        
        // Закрываем модалку
        onClose();
        
        // Перенаправляем на главную
        window.location.href = '/';
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Ошибка при удалении аккаунта');
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
          className="delete-account-modal__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="delete-account-modal__content"
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            onClick={e => e.stopPropagation()}
          >
            <button className="delete-account-modal__close" onClick={onClose}>
              <X size={20} />
            </button>

            <div className="delete-account-modal__icon">
              <AlertTriangle size={48} />
            </div>

            <h2>Удаление аккаунта</h2>
            
            <div className="delete-account-modal__warning">
              <p>Это действие <strong>необратимо</strong>. При удалении аккаунта:</p>
              <ul>
                <li>Ваш профиль будет скрыт</li>
                <li>Все ваши отклики будут отозваны</li>
                <li>История сообщений будет анонимизирована</li>
                <li>Данные будут удалены без возможности восстановления</li>
              </ul>
            </div>

            <div className="delete-account-modal__confirm">
              <label>
                Для подтверждения введите <strong>"УДАЛИТЬ"</strong>:
              </label>
              <input
                type="text"
                placeholder="УДАЛИТЬ"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
              />
            </div>

            {error && (
              <div className="delete-account-modal__error">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="delete-account-modal__actions">
              <button type="button" className="delete-account-modal__cancel" onClick={onClose}>
                Отмена
              </button>
              <button
                type="button"
                className="delete-account-modal__delete"
                onClick={handleDelete}
                disabled={loading || confirmText !== 'УДАЛИТЬ'}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>Удаление...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>Удалить навсегда</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DeleteAccountModal;