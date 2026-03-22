import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Building2, Briefcase, GraduationCap, Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../api/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

type FormMode = 'login' | 'register';

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  email: string;
  password: string;
  display_name: string;
  role: UserRole;
  company_name?: string;
  inn?: string;
}

const AuthModal: React.FC<Props> = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const [mode, setMode] = useState<FormMode>(defaultMode);
  const [loginData, setLoginData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [registerData, setRegisterData] = useState<RegisterFormData>({
    email: '',
    password: '',
    display_name: '',
    role: 'applicant',
    company_name: '',
    inn: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, register, isAuthenticated } = useAuth();

  // Закрываем модалку после успешной авторизации
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }, [isAuthenticated, isOpen, onClose]);

  // Сброс формы при смене режима
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
    if (!registerData.email) newErrors.email = 'Email обязателен';
    if (!registerData.password) newErrors.password = 'Пароль обязателен';
    if (registerData.password.length < 6) newErrors.password = 'Пароль должен быть не менее 6 символов';
    if (!registerData.display_name) newErrors.display_name = 'Имя обязательно';
    if (registerData.display_name.length < 2) newErrors.display_name = 'Имя должно быть не менее 2 символов';
    
    if (registerData.role === 'employer') {
      if (!registerData.company_name) newErrors.company_name = 'Название компании обязательно';
      if (registerData.company_name && registerData.company_name.length < 2) {
        newErrors.company_name = 'Название компании должно быть не менее 2 символов';
      }
      if (registerData.inn && registerData.inn.length !== 10 && registerData.inn.length !== 12) {
        newErrors.inn = 'ИНН должен содержать 10 или 12 цифр';
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
      await login(loginData.email, loginData.password);
      setSuccessMessage('Вход выполнен успешно!');
    } catch (error: any) {
      setErrors({
        form: error.response?.data?.detail || 'Ошибка входа. Проверьте email и пароль'
      });
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
      await register(registerData);
      setSuccessMessage('Регистрация прошла успешно!');
    } catch (error: any) {
      setErrors({
        form: error.response?.data?.detail || 'Ошибка регистрации. Попробуйте другой email'
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
      display_name: '',
      role: 'applicant',
      company_name: '',
      inn: '',
    });
    setErrors({});
    setSuccessMessage('');
  };

  const switchMode = (newMode: FormMode) => {
    resetForms();
    setMode(newMode);
  };

  const roleOptions = [
    { value: 'applicant', label: 'Соискатель', icon: GraduationCap, description: 'Ищу стажировку или работу' },
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

            {/* Заголовок */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="auth-modal__title">
                {mode === 'login' ? 'Добро пожаловать!' : 'Присоединяйся!'}
              </h3>
              <p className="auth-modal__subtitle">
                {mode === 'login' 
                  ? 'Войди в свой аккаунт и продолжай карьерный путь' 
                  : 'Создай аккаунт и получи доступ ко всем возможностям платформы'}
              </p>
            </motion.div>

            {/* Сообщение об успехе */}
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

            {/* Ошибка формы */}
            {errors.form && (
              <motion.div
                className="auth-modal__error"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <AlertCircle size={16} />
                <span>{errors.form}</span>
              </motion.div>
            )}

            {/* Форма входа */}
            {mode === 'login' && (
              <motion.form
                key="login"
                className="auth-modal__form"
                onSubmit={handleLogin}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
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
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <span className="error-message">{errors.password}</span>}
                </div>

                <motion.button
                  type="submit"
                  className="auth-modal__submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
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
                  <button
                    type="button"
                    className="auth-modal__switch"
                    onClick={() => switchMode('register')}
                  >
                    Зарегистрироваться
                  </button>
                </div>
              </motion.form>
            )}

            {/* Форма регистрации */}
            {mode === 'register' && (
              <motion.form
                key="register"
                className="auth-modal__form"
                onSubmit={handleRegister}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="form-group">
                  <div className="input-wrapper">
                    <User className="input-icon" size={18} />
                    <input
                      type="text"
                      placeholder="Как вас называть?"
                      value={registerData.display_name}
                      onChange={(e) => setRegisterData({ ...registerData, display_name: e.target.value })}
                      className={errors.display_name ? 'error' : ''}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.display_name && <span className="error-message">{errors.display_name}</span>}
                </div>

                <div className="form-group">
                  <div className="input-wrapper">
                    <Mail className="input-icon" size={18} />
                    <input
                      type="email"
                      placeholder="Email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      className={errors.email ? 'error' : ''}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Пароль (минимум 6 символов)"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      className={errors.password ? 'error' : ''}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <span className="error-message">{errors.password}</span>}
                </div>

                {/* Выбор роли */}
                <div className="form-group">
                  <label className="role-label">Кто вы?</label>
                  <div className="role-selector">
                    {roleOptions.map(option => {
                      const Icon = option.icon;
                      const isSelected = registerData.role === option.value;
                      return (
                        <motion.button
                          key={option.value}
                          type="button"
                          className={`role-option ${isSelected ? 'active' : ''}`}
                          onClick={() => setRegisterData({ ...registerData, role: option.value as UserRole })}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Icon size={20} />
                          <div className="role-info">
                            <span className="role-name">{option.label}</span>
                            <span className="role-desc">{option.description}</span>
                          </div>
                          {isSelected && <CheckCircle size={16} className="role-check" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Поля для работодателя */}
                <AnimatePresence>
                  {registerData.role === 'employer' && (
                    <motion.div
                      className="employer-fields"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="form-group">
                        <div className="input-wrapper">
                          <Building2 className="input-icon" size={18} />
                          <input
                            type="text"
                            placeholder="Название компании"
                            value={registerData.company_name}
                            onChange={(e) => setRegisterData({ ...registerData, company_name: e.target.value })}
                            className={errors.company_name ? 'error' : ''}
                            disabled={isLoading}
                          />
                        </div>
                        {errors.company_name && <span className="error-message">{errors.company_name}</span>}
                      </div>

                      <div className="form-group">
                        <div className="input-wrapper">
                          <Briefcase className="input-icon" size={18} />
                          <input
                            type="text"
                            placeholder="ИНН (10 или 12 цифр, опционально)"
                            value={registerData.inn}
                            onChange={(e) => setRegisterData({ ...registerData, inn: e.target.value.replace(/\D/g, '') })}
                            className={errors.inn ? 'error' : ''}
                            disabled={isLoading}
                            maxLength={12}
                          />
                        </div>
                        {errors.inn && <span className="error-message">{errors.inn}</span>}
                        <span className="input-hint">
                          Указание ИНН ускорит верификацию компании
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  className="auth-modal__submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
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
                  <button
                    type="button"
                    className="auth-modal__switch"
                    onClick={() => switchMode('login')}
                  >
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