// frontend/src/pages/EmailVerification.tsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Home, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const hasVerified = useRef(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (hasVerified.current) return;
      hasVerified.current = true;

      if (!token) {
        setStatus('error');
        setErrorMessage('Отсутствует токен подтверждения');
        return;
      }

      try {
        const response = await fetch(`/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          setStatus('error');
          setErrorMessage(data.detail || 'Не удалось подтвердить email');
          return;
        }
        
        if (data.access_token) {
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          await refreshUser();
        }
        
        setStatus('success');
        
        // ВАЖНО: перенаправляем на /student/profile
        setTimeout(() => {
          navigate('/student/profile', { replace: true });
        }, 2000);
        
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setErrorMessage('Произошла ошибка при подтверждении email');
      }
    };

    verifyEmail();
  }, [token, navigate, refreshUser]);

  return (
    <div className="email-verification">
      <div className="app__bg-glow app__bg-glow--1"></div>
      <div className="app__bg-glow app__bg-glow--2"></div>
      <div className="app__bg-glow app__bg-glow--3"></div>

      <div className="container">
        <motion.div
          className="email-verification__container"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          {status === 'loading' && (
            <>
              <div className="email-verification__icon loading">
                <Loader2 size={64} className="spinner" />
              </div>
              <h2 className="email-verification__title">Подтверждение email</h2>
              <p className="email-verification__message">
                Пожалуйста, подождите, мы проверяем ваш email...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="email-verification__icon success">
                <CheckCircle size={64} />
              </div>
              <h2 className="email-verification__title">Email подтвержден!</h2>
              <p className="email-verification__message">
                Ваш email успешно подтвержден.
              </p>
              <p className="email-verification__submessage">
                Перенаправляем в личный кабинет...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="email-verification__icon error">
                <XCircle size={64} />
              </div>
              <h2 className="email-verification__title">Ошибка подтверждения</h2>
              <p className="email-verification__message">{errorMessage}</p>
              <div className="email-verification__actions">
                <button
                  className="email-verification__button primary"
                  onClick={() => navigate('/')}
                >
                  <Home size={18} />
                  <span>На главную</span>
                </button>
                <button
                  className="email-verification__button secondary"
                  onClick={() => navigate('/')}
                >
                  <LogIn size={18} />
                  <span>Войти</span>
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default EmailVerification;