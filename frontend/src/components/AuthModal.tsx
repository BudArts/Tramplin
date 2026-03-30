// frontend/src/components/AuthModal.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Building2, Briefcase, GraduationCap, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, Phone, UserRound } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
  onForgotPassword?: () => void;
}

type FormMode = 'login' | 'register';
type RegisterRole = 'applicant' | 'employer';

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  patronymic: string;
  phone: string;
  role: RegisterRole;
  company_name: string;
  inn: string;
  company_email: string;
}

const AuthModal: React.FC<Props> = ({ isOpen, onClose, defaultMode = 'login', onForgotPassword }) => {
  const navigate = useNavigate();
  const { login, register, loadUser, isAuthenticated, user } = useAuth();
  const [mode, setMode] = useState<FormMode>(defaultMode);
  const [loginData, setLoginData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [registerData, setRegisterData] = useState<RegisterFormData>({
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    patronymic: '',
    phone: '',
    role: 'applicant',
    company_name: '',
    inn: '',
    company_email: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setErrors({});
      setSuccessMessage('');
      setLoginSuccess(false);
      setLoginData({ email: '', password: '' });
      setRegisterData({
        email: '',
        password: '',
        password_confirm: '',
        first_name: '',
        last_name: '',
        patronymic: '',
        phone: '',
        role: 'applicant',
        company_name: '',
        inn: '',
        company_email: '',
      });
    }
  }, [defaultMode, isOpen]);

  // Обновленная логика перенаправления после входа
  useEffect(() => {
    if (loginSuccess && isAuthenticated && user) {
      console.log('Redirecting to dashboard based on role:', user.role);
      
      // Сначала закрываем модальное окно
      onClose();
      
      // Небольшая задержка перед редиректом
      setTimeout(() => {
        // Перенаправление в зависимости от роли пользователя
        switch (user.role) {
          case 'student':
            navigate('/student', { replace: true });
            break;
          case 'company':
            navigate('/company', { replace: true });
            break;
          case 'curator':
          case 'admin':
            navigate('/curator', { replace: true });
            break;
          default:
            navigate('/', { replace: true });
        }
      }, 100);
      
      // Сбрасываем флаг
      setLoginSuccess(false);
    }
  }, [loginSuccess, isAuthenticated, user, onClose, navigate]);

  useEffect(() => {
    setErrors({});
    setSuccessMessage('');
  }, [mode]);

  const validateLogin = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!loginData.email) newErrors.email = 'Email обязателен';
    if (!loginData.password) newErrors.password = 'Пароль обязателен';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRegister = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (registerData.role === 'applicant') {
      if (!registerData.first_name) newErrors.first_name = 'Имя обязательно';
      if (!registerData.last_name) newErrors.last_name = 'Фамилия обязательна';
      if (!registerData.email) newErrors.email = 'Email обязателен';
      if (!registerData.password) newErrors.password = 'Пароль обязателен';
      if (registerData.password.length < 6) newErrors.password = 'Минимум 6 символов';

      const hasLetter = /[a-zA-Zа-яА-Я]/.test(registerData.password);
      if (!hasLetter) {
        newErrors.password = 'Пароль должен содержать хотя бы одну букву';
      }

      if (registerData.password !== registerData.password_confirm) {
        newErrors.password_confirm = 'Пароли не совпадают';
      }
    } else {
      if (!registerData.company_name) newErrors.company_name = 'Название компании обязательно';
      if (!registerData.inn) newErrors.inn = 'ИНН обязателен';
      if (registerData.inn && registerData.inn.length !== 10 && registerData.inn.length !== 12) {
        newErrors.inn = 'ИНН должен быть 10 или 12 цифр';
      }
      if (!registerData.company_email) newErrors.company_email = 'Корпоративный email обязателен';

      if (registerData.company_email) {
        const domain = registerData.company_email.split('@')[1]?.toLowerCase();
        const freeDomains = ['gmail.com', 'mail.ru', 'yandex.ru', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rambler.ru', 'bk.ru', 'list.ru', 'inbox.ru', 'gmx.com', 'icloud.com', 'me.com', 'live.com', 'mail.com', 'protonmail.com'];
        if (freeDomains.includes(domain)) {
          newErrors.company_email = 'Требуется корпоративная почта (например, @company.ru)';
        }
      }

      if (!registerData.first_name) newErrors.first_name = 'Имя контактного лица обязательно';
      if (!registerData.last_name) newErrors.last_name = 'Фамилия контактного лица обязательна';
      if (!registerData.email) newErrors.email = 'Email контактного лица обязателен';
      if (!registerData.password) newErrors.password = 'Пароль обязателен';
      if (registerData.password.length < 6) newErrors.password = 'Минимум 6 символов';

      const hasLetter = /[a-zA-Zа-яА-Я]/.test(registerData.password);
      if (!hasLetter) {
        newErrors.password = 'Пароль должен содержать хотя бы одну букву';
      }

      if (registerData.password !== registerData.password_confirm) {
        newErrors.password_confirm = 'Пароли не совпадают';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const result = await login(loginData.email, loginData.password);

      if (result.error) {
        setErrors({ form: result.error });
      } else {
        setSuccessMessage('Вход выполнен успешно!');
        // Устанавливаем флаг успешного входа
        // Даем время на загрузку данных пользователя
        setTimeout(() => {
          setLoginSuccess(true);
        }, 500);
      }
    } catch (error: any) {
      setErrors({ form: error.message || 'Ошибка входа' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegister()) return;

    setIsLoading(true);
    setErrors({});

    try {
      if (registerData.role === 'applicant') {
        const result = await register({
          email: registerData.email,
          password: registerData.password,
          password_confirm: registerData.password_confirm,
          first_name: registerData.first_name,
          last_name: registerData.last_name,
          patronymic: registerData.patronymic || '',
          phone: registerData.phone || '',
        });

        if (result.error) {
          setErrors({ form: result.error });
        } else {
          setSuccessMessage('Регистрация успешна! Проверьте почту для подтверждения.');
          setTimeout(() => {
            onClose();
            navigate('/verify-email-pending', { state: { email: registerData.email } });
          }, 2000);
        }
      } else {
        // Регистрация компании
        const response = await fetch('/companies/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inn: registerData.inn,
            company_name: registerData.company_name,
            email: registerData.company_email,
            phone: registerData.phone || '',
            user_first_name: registerData.first_name,
            user_last_name: registerData.last_name,
            user_patronymic: registerData.patronymic || '',
            user_email: registerData.email,
            user_password: registerData.password,
            user_password_confirm: registerData.password_confirm,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setErrors({ form: data.detail || 'Ошибка регистрации компании' });
        } else {
          setSuccessMessage('Регистрация компании успешна! Проверьте почту для подтверждения.');
          setTimeout(() => {
            onClose();
            navigate('/verify-email-pending', { state: { email: registerData.company_email } });
          }, 2000);
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setErrors({ form: error.message || 'Ошибка регистрации' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForms = () => {
    setLoginData({ email: '', password: '' });
    setRegisterData({
      email: '',
      password: '',
      password_confirm: '',
      first_name: '',
      last_name: '',
      patronymic: '',
      phone: '',
      role: 'applicant',
      company_name: '',
      inn: '',
      company_email: '',
    });
    setErrors({});
    setSuccessMessage('');
    setLoginSuccess(false);
  };

  const switchMode = (newMode: FormMode) => {
    resetForms();
    setMode(newMode);
  };

  const handleForgotPasswordClick = () => {
    onClose();
    if (onForgotPassword) {
      onForgotPassword();
    }
  };

  const roleOptions = [
    { value: 'applicant', label: 'Соискатель', icon: GraduationCap, description: 'Ищу работу или стажировку' },
    { value: 'employer', label: 'Работодатель', icon: Building2, description: 'Ищу сотрудников' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="auth-modal__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="auth-modal__content"
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
          >
            <button className="auth-modal__close" onClick={onClose}>
              <X size={20} />
            </button>

            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h3 className="auth-modal__title">
                {mode === 'login' ? 'Добро пожаловать!' : 'Присоединяйся!'}
              </h3>
              <p className="auth-modal__subtitle">
                {mode === 'login'
                  ? 'Войди в аккаунт и продолжай карьерный путь'
                  : 'Создай аккаунт и получи доступ ко всем возможностям'}
              </p>
            </motion.div>

            <AnimatePresence>
              {successMessage && (
                <motion.div
                  className="auth-modal__success"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <CheckCircle size={18} />
                  <span>{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {errors.form && (
              <motion.div className="auth-modal__error" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <AlertCircle size={16} />
                <span>{errors.form}</span>
              </motion.div>
            )}

            {mode === 'login' && (
              <motion.form key="login" className="auth-modal__form" onSubmit={handleLogin}>
                <div className="form-group">
                  <div className="input-wrapper">
                    <Mail className="input-icon" size={18} />
                    <input
                      type="email"
                      placeholder="Email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className={errors.email ? 'error' : ''}
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Пароль"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className={errors.password ? 'error' : ''}
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <span className="error-message">{errors.password}</span>}
                </div>

                <div className="auth-modal__forgot-password-wrapper">
                  <button
                    type="button"
                    className="auth-modal__forgot-password"
                    onClick={handleForgotPasswordClick}
                  >
                    Забыли пароль?
                  </button>
                </div>

                <motion.button type="submit" className="auth-modal__submit" disabled={isLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      <span>Вход...</span>
                    </>
                  ) : (
                    <span>Войти</span>
                  )}
                </motion.button>

                <div className="auth-modal__footer">
                  <span>Нет аккаунта?</span>
                  <button type="button" className="auth-modal__switch" onClick={() => switchMode('register')}>
                    Зарегистрироваться
                  </button>
                </div>
              </motion.form>
            )}

            {mode === 'register' && (
              <motion.form key="register" className="auth-modal__form" onSubmit={handleRegister}>
                <div className="form-group">
                  <div className="role-selector">
                    {roleOptions.map(option => {
                      const Icon = option.icon;
                      const isSelected = registerData.role === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`role-option ${isSelected ? 'active' : ''}`}
                          onClick={() => setRegisterData({ ...registerData, role: option.value as RegisterRole })}
                        >
                          <Icon size={20} />
                          <div className="role-info">
                            <span className="role-name">{option.label}</span>
                            <span className="role-desc">{option.description}</span>
                          </div>
                          {isSelected && <CheckCircle size={16} className="role-check" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {registerData.role === 'applicant' && (
                  <div>
                    <div className="form-group">
                      <div className="input-wrapper">
                        <UserRound className="input-icon" size={18} />
                        <input
                          type="text"
                          placeholder="Имя *"
                          value={registerData.first_name}
                          onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
                          className={errors.first_name ? 'error' : ''}
                          autoComplete="given-name"
                        />
                      </div>
                      {errors.first_name && <span className="error-message">{errors.first_name}</span>}
                    </div>

                    <div className="form-group">
                      <div className="input-wrapper">
                        <UserRound className="input-icon" size={18} />
                        <input
                          type="text"
                          placeholder="Фамилия *"
                          value={registerData.last_name}
                          onChange={(e) => setRegisterData({ ...registerData, last_name: e.target.value })}
                          className={errors.last_name ? 'error' : ''}
                          autoComplete="family-name"
                        />
                      </div>
                      {errors.last_name && <span className="error-message">{errors.last_name}</span>}
                    </div>

                    <div className="form-group">
                      <div className="input-wrapper">
                        <UserRound className="input-icon" size={18} />
                        <input
                          type="text"
                          placeholder="Отчество"
                          value={registerData.patronymic}
                          onChange={(e) => setRegisterData({ ...registerData, patronymic: e.target.value })}
                          autoComplete="additional-name"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <div className="input-wrapper">
                        <Phone className="input-icon" size={18} />
                        <input
                          type="tel"
                          placeholder="Телефон"
                          value={registerData.phone}
                          onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <div className="input-wrapper">
                        <Mail className="input-icon" size={18} />
                        <input
                          type="email"
                          placeholder="Email *"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          className={errors.email ? 'error' : ''}
                          autoComplete="email"
                        />
                      </div>
                      {errors.email && <span className="error-message">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                      <div className="input-wrapper">
                        <Lock className="input-icon" size={18} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Пароль (мин. 6 символов) *"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          className={errors.password ? 'error' : ''}
                          autoComplete="new-password"
                        />
                        <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {errors.password && <span className="error-message">{errors.password}</span>}
                    </div>

                    <div className="form-group">
                      <div className="input-wrapper">
                        <Lock className="input-icon" size={18} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Подтвердите пароль *"
                          value={registerData.password_confirm}
                          onChange={(e) => setRegisterData({ ...registerData, password_confirm: e.target.value })}
                          className={errors.password_confirm ? 'error' : ''}
                          autoComplete="new-password"
                        />
                      </div>
                      {errors.password_confirm && <span className="error-message">{errors.password_confirm}</span>}
                    </div>
                  </div>
                )}

                {registerData.role === 'employer' && (
                  <div>
                    <div className="form-group">
                      <div className="input-wrapper">
                        <Building2 className="input-icon" size={18} />
                        <input
                          type="text"
                          placeholder="Название компании *"
                          value={registerData.company_name}
                          onChange={(e) => setRegisterData({ ...registerData, company_name: e.target.value })}
                          className={errors.company_name ? 'error' : ''}
                          autoComplete="organization"
                        />
                      </div>
                      {errors.company_name && <span className="error-message">{errors.company_name}</span>}
                    </div>

                    <div className="form-group">
                      <div className="input-wrapper">
                        <Briefcase className="input-icon" size={18} />
                        <input
                          type="text"
                          placeholder="ИНН (10 или 12 цифр) *"
                          value={registerData.inn}
                          onChange={(e) => setRegisterData({ ...registerData, inn: e.target.value.replace(/\D/g, '') })}
                          className={errors.inn ? 'error' : ''}
                          maxLength={12}
                          autoComplete="off"
                        />
                      </div>
                      {errors.inn && <span className="error-message">{errors.inn}</span>}
                    </div>

                    <div className="form-group">
                      <div className="input-wrapper">
                        <Mail className="input-icon" size={18} />
                        <input
                          type="email"
                          placeholder="Корпоративный email * (например, @company.ru)"
                          value={registerData.company_email}
                          onChange={(e) => setRegisterData({ ...registerData, company_email: e.target.value })}
                          className={errors.company_email ? 'error' : ''}
                          autoComplete="email"
                        />
                      </div>
                      {errors.company_email && <span className="error-message">{errors.company_email}</span>}
                    </div>

                    <div className="form-group">
                      <div className="input-wrapper">
                        <Phone className="input-icon" size={18} />
                        <input
                          type="tel"
                          placeholder="Телефон компании"
                          value={registerData.phone}
                          onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <div className="input-wrapper">
                        <UserRound className="input-icon" size={18} />
                        <input
                          type="text"
                          placeholder="Имя контактного лица *"
                          value={registerData.first_name}
                          onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
                          className={errors.first_name ? 'error' : ''}
                          autoComplete="given-name"
                        />
                      </div>
                      {errors.first_name && <span className="error-message">{errors.first_name}</span>}
                    </div>

                    <div className="form-group">
                      <div className="input-wrapper">
                        <UserRound className="input-icon" size={18} />
                        <input
                          type="text"
                          placeholder="Фамилия контактного лица *"
                          value={registerData.last_name}
                          onChange={(e) => setRegisterData({ ...registerData, last_name: e.target.value })}
                          className={errors.last_name ? 'error' : ''}
                          autoComplete="family-name"
                        />
                      </div>
                      {errors.last_name && <span className="error-message">{errors.last_name}</span>}
                    </div>

                    <div className="form-group">
                      <div className="input-wrapper">
                        <UserRound className="input-icon" size={18} />
                        <input
                          type="text"
                          placeholder="Отчество контактного лица"
                          value={registerData.patronymic}
                          onChange={(e) => setRegisterData({ ...registerData, patronymic: e.target.value })}
                          autoComplete="additional-name"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <div className="input-wrapper">
                        <Mail className="input-icon" size={18} />
                        <input
                          type="email"
                          placeholder="Email контактного лица *"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          className={errors.email ? 'error' : ''}
                          autoComplete="email"
                        />
                      </div>
                      {errors.email && <span className="error-message">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                      <div className="input-wrapper">
                        <Lock className="input-icon" size={18} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Пароль (мин. 6 символов) *"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          className={errors.password ? 'error' : ''}
                          autoComplete="new-password"
                        />
                        <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {errors.password && <span className="error-message">{errors.password}</span>}
                    </div>

                    <div className="form-group">
                      <div className="input-wrapper">
                        <Lock className="input-icon" size={18} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Подтвердите пароль *"
                          value={registerData.password_confirm}
                          onChange={(e) => setRegisterData({ ...registerData, password_confirm: e.target.value })}
                          className={errors.password_confirm ? 'error' : ''}
                          autoComplete="new-password"
                        />
                      </div>
                      {errors.password_confirm && <span className="error-message">{errors.password_confirm}</span>}
                    </div>
                  </div>
                )}

                <motion.button type="submit" className="auth-modal__submit" disabled={isLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      <span>Регистрация...</span>
                    </>
                  ) : (
                    <span>Создать аккаунт</span>
                  )}
                </motion.button>

                <div className="auth-modal__footer">
                  <span>Уже есть аккаунт?</span>
                  <button type="button" className="auth-modal__switch" onClick={() => switchMode('login')}>
                    Войти
                  </button>
                </div>
              </motion.form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;