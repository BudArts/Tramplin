// frontend/src/components/PasswordResetModal.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Send, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'request' | 'confirm';
  token?: string;
}

const PasswordResetModal = ({ isOpen, onClose, mode = 'request', token }: PasswordResetModalProps) => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/auth/password-reset/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          setEmail('');
        }, 3000);
      } else {
        setError(data.detail || 'Ошибка при отправке запроса');
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (newPassword.length < 8) {
      setError('Пароль должен содержать не менее 8 символов');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/auth/password-reset/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          new_password: newPassword,
          new_password_confirm: confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          setNewPassword('');
          setConfirmPassword('');
        }, 2000);
      } else {
        setError(data.detail || 'Ошибка при сбросе пароля');
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
          className="password-reset-modal__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="password-reset-modal__content"
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            onClick={e => e.stopPropagation()}
          >
            <button className="password-reset-modal__close" onClick={onClose}>
              <X size={20} />
            </button>

            <div className="password-reset-modal__header">
              <Lock size={28} />
              <h2>{mode === 'request' ? 'Сброс пароля' : 'Установка нового пароля'}</h2>
              <p>
                {mode === 'request'
                  ? 'Введите email, указанный при регистрации'
                  : 'Введите новый пароль для вашего аккаунта'}
              </p>
            </div>

            {success ? (
              <motion.div
                className="password-reset-modal__success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <CheckCircle size={48} />
                <h3>
                  {mode === 'request'
                    ? 'Письмо отправлено!'
                    : 'Пароль успешно изменен!'}
                </h3>
                <p>
                  {mode === 'request'
                    ? 'Проверьте вашу почту и перейдите по ссылке для сброса пароля'
                    : 'Теперь вы можете войти с новым паролем'}
                </p>
              </motion.div>
            ) : (
              <form
                onSubmit={mode === 'request' ? handleRequestReset : handleConfirmReset}
                className="password-reset-modal__form"
              >
                {mode === 'request' ? (
                  <div className="password-reset-modal__field">
                    <label>Email</label>
                    <div className="password-reset-modal__input-wrapper">
                      <Mail size={18} />
                      <input
                        type="email"
                        placeholder="example@mail.ru"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="password-reset-modal__field">
                      <label>Новый пароль</label>
                      <div className="password-reset-modal__input-wrapper">
                        <Lock size={18} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Минимум 8 символов"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="password-reset-modal__toggle-password"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div className="password-reset-modal__field">
                      <label>Подтвердите пароль</label>
                      <div className="password-reset-modal__input-wrapper">
                        <Lock size={18} />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Повторите пароль"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="password-reset-modal__toggle-password"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {error && (
                  <div className="password-reset-modal__error">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="password-reset-modal__actions">
                  <button
                    type="button"
                    className="password-reset-modal__cancel"
                    onClick={onClose}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="password-reset-modal__submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="spinner-small"></div>
                        <span>Отправка...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>{mode === 'request' ? 'Отправить' : 'Сменить пароль'}</span>
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

export default PasswordResetModal;