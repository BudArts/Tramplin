// frontend/src/pages/adminDashboard/CreateCuratorPage.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Phone, Shield, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface AdminContext {
  user: any;
  refreshStats: () => void;
  stats: any;
}

const CreateCuratorPage = () => {
  const navigate = useNavigate();
  const { refreshStats } = useOutletContext<AdminContext>();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    phone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.password_confirm) {
      setError('Пароли не совпадают');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const token = localStorage.getItem('access_token');
    
    try {
      const response = await fetch('/api/curator/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone || null,
          role: 'curator',
        }),
      });
      
      if (response.ok) {
        setSuccess(true);
        refreshStats();
        setTimeout(() => {
          navigate('/admin/curators');
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.detail || 'Ошибка при создании куратора');
      }
    } catch (err) {
      console.error('Error creating curator:', err);
      setError('Ошибка сети. Проверьте подключение.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-create-curator">
      <motion.div
        className="admin-create-curator__header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button className="admin-create-curator__back" onClick={() => navigate('/admin/curators')}>
          <ArrowLeft size={20} />
          <span>Назад к списку кураторов</span>
        </button>
        <div className="admin-create-curator__title-wrapper">
          <UserPlus size={28} />
          <h1>Создание куратора</h1>
        </div>
        <p>Добавьте нового куратора для модерации платформы</p>
      </motion.div>

      {success ? (
        <motion.div
          className="admin-create-curator__success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="admin-create-curator__success-icon">
            <CheckCircle size={64} />
          </div>
          <h2>Куратор успешно создан!</h2>
          <p>Новый куратор получит письмо с инструкциями для входа</p>
          <div className="admin-create-curator__success-email">
            <Mail size={16} />
            <span>{formData.email}</span>
          </div>
          <button
            className="admin-create-curator__done-btn"
            onClick={() => navigate('/admin/curators')}
          >
            Вернуться к списку
          </button>
        </motion.div>
      ) : (
        <motion.form
          className="admin-create-curator__form-container"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {error && (
            <div className="admin-create-curator__error">
              <XCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="admin-create-curator__form">
            <div className="admin-create-curator__form-group">
              <label>Email</label>
              <div className="admin-create-curator__input-wrapper">
                <Mail size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="curator@example.com"
                  required
                />
              </div>
            </div>

            <div className="admin-create-curator__form-group">
              <label>Пароль</label>
              <div className="admin-create-curator__input-wrapper">
                <Lock size={18} />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Минимум 6 символов"
                  required
                />
              </div>
            </div>

            <div className="admin-create-curator__form-group">
              <label>Подтверждение пароля</label>
              <div className="admin-create-curator__input-wrapper">
                <Lock size={18} />
                <input
                  type="password"
                  name="password_confirm"
                  value={formData.password_confirm}
                  onChange={handleChange}
                  placeholder="Повторите пароль"
                  required
                />
              </div>
            </div>

            <div className="admin-create-curator__form-row">
              <div className="admin-create-curator__form-group">
                <label>Имя</label>
                <div className="admin-create-curator__input-wrapper">
                  <User size={18} />
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="Имя"
                    required
                  />
                </div>
              </div>
              <div className="admin-create-curator__form-group">
                <label>Фамилия</label>
                <div className="admin-create-curator__input-wrapper">
                  <User size={18} />
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Фамилия"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="admin-create-curator__form-group">
              <label>Телефон (необязательно)</label>
              <div className="admin-create-curator__input-wrapper">
                <Phone size={18} />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
            </div>

            <div className="admin-create-curator__actions">
              <button
                type="button"
                className="admin-create-curator__cancel-btn"
                onClick={() => navigate('/admin/curators')}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="admin-create-curator__submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>Создание...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>Создать куратора</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.form>
      )}
    </div>
  );
};

export default CreateCuratorPage;