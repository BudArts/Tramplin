// frontend/src/components/AuthModal.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Building2, Briefcase, GraduationCap, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, Phone, UserRound } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- ДОБАВЬТЕ ЭТОТ ИМПОРТ
import { useAuth } from '../hooks/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AuthModal: React.FC<Props> = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const navigate = useNavigate(); // <-- ДОБАВЬТЕ ЭТУ СТРОКУ
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

  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && isOpen) {
      setTimeout(() => onClose(), 1500);
    }
  }, [isAuthenticated, isOpen, onClose]);

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
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка входа');
      }

      const data = await response.json();
      
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      setSuccessMessage('Вход выполнен успешно!');
      setTimeout(() => {
        onClose();
        navigate('/dashboard'); // <-- ДОБАВЬТЕ ПЕРЕНАПРАВЛЕНИЕ ПОСЛЕ ВХОДА
      }, 1500);
    } catch (error: any) {
      setErrors({ form: error.message || 'Ошибка входа. Проверьте email и пароль' });
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
        const payload = {
          email: registerData.email,
          password: registerData.password,
          password_confirm: registerData.password_confirm,
          first_name: registerData.first_name,
          last_name: registerData.last_name,
          patronymic: registerData.patronymic || '',
          phone: registerData.phone || '',
        };
        
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          
          if (errorData.detail && Array.isArray(errorData.detail)) {
            const fieldErrors: Record<string, string> = {};
            errorData.detail.forEach((err: any) => {
              const field = err.loc[err.loc.length - 1];
              fieldErrors[field] = err.msg;
            });
            setErrors(fieldErrors);
            throw new Error('Пожалуйста, исправьте ошибки в форме');
          } else {
            throw new Error(errorData?.detail || `Ошибка регистрации: ${response.status}`);
          }
        }

        // Успешная регистрация - закрываем модалку и перенаправляем на страницу подтверждения
        onClose();
        navigate('/email-verification-pending', { state: { email: registerData.email } });
        
      } else {
        // Регистрация компании
        const checkResponse = await fetch(`${API_BASE_URL}/companies/check-inn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inn: registerData.inn }),
        });

        if (!checkResponse.ok) {
          const error = await checkResponse.json();
          throw new Error(error.detail || 'ИНН не найден или компания не активна');
        }

        const registerResponse = await fetch(`${API_BASE_URL}/companies/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inn: registerData.inn,
            email: registerData.company_email,
            phone: registerData.phone || '',
            website: '',
            user_first_name: registerData.first_name,
            user_last_name: registerData.last_name,
            user_patronymic: registerData.patronymic || '',
            user_email: registerData.email,
            user_password: registerData.password,
            user_password_confirm: registerData.password_confirm,
          }),
        });

        if (!registerResponse.ok) {
          const error = await registerResponse.json();
          throw new Error(error.detail || 'Ошибка регистрации компании');
        }

        // Успешная регистрация компании
        onClose();
        navigate('/email-verification-pending', { state: { email: registerData.company_email } });
      }

    } catch (error: any) {
      setErrors({
        form: error.message || 'Ошибка регистрации. Попробуйте другой email'
      });
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
  };

  const switchMode = (newMode: FormMode) => {
    resetForms();
    setMode(newMode);
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

            {/* Форма входа */}
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

            {/* Форма регистрации */}
            {mode === 'register' && (
              <motion.form key="register" className="auth-modal__form" onSubmit={handleRegister}>
                {/* Выбор роли */}
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

                {/* Поля для соискателя */}
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
                          placeholder="Пароль (мин. 6 символов, буквы и цифры) *"
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

                {/* Поля для работодателя */}
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
                          placeholder="Корпоративный email *"
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
                        <Phone className="input-icon" size={18} />
                        <input
                          type="tel"
                          placeholder="Телефон контактного лица"
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
                          placeholder="Пароль (мин. 6 символов, буквы и цифры) *"
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