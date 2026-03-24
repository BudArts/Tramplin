// frontend/src/pages/EmailVerificationPending.tsx
import { motion } from 'framer-motion';
import { Mail, ArrowRight, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';


const EmailVerificationPending = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  // Автоматический таймер для повторной отправки
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (countdown > 0) return;
    
    setIsResending(true);
    setResendMessage('');
    setResendError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResendMessage('Письмо отправлено повторно! Проверьте почту.');
        setCountdown(60); // Блокируем повторную отправку на 60 секунд
      } else {
        setResendError(data.detail || 'Не удалось отправить письмо');
      }
    } catch (error) {
      setResendError('Произошла ошибка. Попробуйте позже.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="email-verification-pending">
      {/* Фоновые свечения */}
      <div className="app__bg-glow app__bg-glow--1"></div>
      <div className="app__bg-glow app__bg-glow--2"></div>
      <div className="app__bg-glow app__bg-glow--3"></div>

      <div className="container">
        <motion.div
          className="email-verification-pending__container"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="email-verification-pending__icon-wrapper">
            <div className="email-verification-pending__icon">
              <Mail size={64} />
            </div>
          </div>

          <h1 className="email-verification-pending__title">
            Проверьте вашу почту
          </h1>

          <p className="email-verification-pending__description">
            Мы отправили письмо для подтверждения email на адрес:
          </p>

          <div className="email-verification-pending__email-card">
            <span className="email-verification-pending__email">{email || 'ваш email'}</span>
          </div>

          <div className="email-verification-pending__steps">
            <div className="email-verification-pending__step">
              <div className="step-number">1</div>
              <div className="step-content">
                <div className="step-title">Откройте письмо</div>
                <div className="step-desc">Найдите письмо от Tramplin во входящих</div>
              </div>
            </div>
            <div className="email-verification-pending__step">
              <div className="step-number">2</div>
              <div className="step-content">
                <div className="step-title">Нажмите на кнопку</div>
                <div className="step-desc">"Подтвердить email" в письме</div>
              </div>
            </div>
            <div className="email-verification-pending__step">
              <div className="step-number">3</div>
              <div className="step-content">
                <div className="step-title">Готово!</div>
                <div className="step-desc">Вы будете перенаправлены в личный кабинет</div>
              </div>
            </div>
          </div>

          {resendMessage && (
            <motion.div
              className="email-verification-pending__success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CheckCircle size={18} />
              <span>{resendMessage}</span>
            </motion.div>
          )}

          {resendError && (
            <motion.div
              className="email-verification-pending__error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <XCircle size={18} />
              <span>{resendError}</span>
            </motion.div>
          )}

          <button
            className="email-verification-pending__resend"
            onClick={handleResendEmail}
            disabled={isResending || countdown > 0}
          >
            {isResending ? (
              <>
                <RefreshCw size={18} className="spinner" />
                <span>Отправка...</span>
              </>
            ) : countdown > 0 ? (
              <>
                <RefreshCw size={18} />
                <span>Отправить повторно через {countdown}с</span>
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                <span>Отправить письмо повторно</span>
              </>
            )}
          </button>

          <button
            className="email-verification-pending__back"
            onClick={() => navigate('/')}
          >
            <ArrowRight size={18} />
            <span>Вернуться на главную</span>
          </button>

          <p className="email-verification-pending__hint">
            Не нашли письмо? Проверьте папку "Спам" или "Нежелательные"
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default EmailVerificationPending;