// frontend/src/pages/companyDashboard/SettingsPage.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { 
  Settings, 
  Save, 
  Bell, 
  Lock, 
  Globe, 
  Shield, 
  Mail, 
  Phone, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface CompanyContext {
  user: any;
  refreshStats: () => void;
  stats: any;
}

const SettingsPage = () => {
  const { user, refreshStats, loadUser } = useOutletContext<CompanyContext>();
  const { updateUserPartial } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Notification settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newApplicationEmail, setNewApplicationEmail] = useState(true);
  const [statusChangeEmail, setStatusChangeEmail] = useState(true);
  const [moderationEmail, setModerationEmail] = useState(true);
  
  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirm: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Profile visibility
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'contacts_only' | 'private'>('public');
  const [showContactInfo, setShowContactInfo] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch('/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.notification_preferences) {
          setEmailNotifications(data.notification_preferences.email ?? true);
          setNewApplicationEmail(data.notification_preferences.new_application ?? true);
          setStatusChangeEmail(data.notification_preferences.status_change ?? true);
          setModerationEmail(data.notification_preferences.moderation ?? true);
        }
        if (data.profile_privacy) {
          setProfileVisibility(data.profile_privacy);
        }
        if (data.show_contact_info !== undefined) {
          setShowContactInfo(data.show_contact_info);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    setMessage(null);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch('/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notification_preferences: {
            email: emailNotifications,
            push: notificationsEnabled,
            new_application: newApplicationEmail,
            status_change: statusChangeEmail,
            moderation: moderationEmail,
          },
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Настройки уведомлений сохранены' });
        refreshStats();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Ошибка при сохранении' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Ошибка сети' });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrivacy = async () => {
    setLoading(true);
    setMessage(null);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch('/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          profile_privacy: profileVisibility,
          show_contact_info: showContactInfo,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Настройки приватности сохранены' });
        refreshStats();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Ошибка при сохранении' });
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      setMessage({ type: 'error', text: 'Ошибка сети' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.new_password_confirm) {
      setMessage({ type: 'error', text: 'Новые пароли не совпадают' });
      return;
    }
    
    if (passwordData.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Пароль должен содержать не менее 6 символов' });
      return;
    }
    
    setPasswordLoading(true);
    setMessage(null);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch('/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Пароль успешно изменен' });
        setPasswordData({ current_password: '', new_password: '', new_password_confirm: '' });
        setShowPasswordForm(false);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Ошибка при изменении пароля' });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: 'Ошибка сети' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="company-settings">
      <motion.div
        className="company-settings__header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="company-settings__title-wrapper">
          <Settings size={28} />
          <h1>Настройки</h1>
        </div>
        <p>Управление уведомлениями, приватностью и безопасностью аккаунта</p>
      </motion.div>

      {message && (
        <motion.div
          className={`company-settings__message company-settings__message--${message.type}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </motion.div>
      )}

      <div className="company-settings__grid">
        {/* Notification Settings */}
        <motion.div
          className="company-settings__section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="company-settings__section-header">
            <Bell size={20} />
            <h2>Уведомления</h2>
          </div>
          <div className="company-settings__options">
            <label className="company-settings__option">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
              />
              <div className="company-settings__option-content">
                <div className="company-settings__option-label">Push-уведомления</div>
                <div className="company-settings__option-desc">Получать уведомления в браузере</div>
              </div>
            </label>
            <label className="company-settings__option">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              <div className="company-settings__option-content">
                <div className="company-settings__option-label">Email-уведомления</div>
                <div className="company-settings__option-desc">Получать уведомления на почту</div>
              </div>
            </label>
            <div className="company-settings__divider"></div>
            <label className="company-settings__option">
              <input
                type="checkbox"
                checked={newApplicationEmail}
                onChange={(e) => setNewApplicationEmail(e.target.checked)}
                disabled={!emailNotifications}
              />
              <div className="company-settings__option-content">
                <div className="company-settings__option-label">Новые отклики</div>
                <div className="company-settings__option-desc">Уведомления о новых откликах на вакансии</div>
              </div>
            </label>
            <label className="company-settings__option">
              <input
                type="checkbox"
                checked={statusChangeEmail}
                onChange={(e) => setStatusChangeEmail(e.target.checked)}
                disabled={!emailNotifications}
              />
              <div className="company-settings__option-content">
                <div className="company-settings__option-label">Изменение статуса отклика</div>
                <div className="company-settings__option-desc">Уведомления об изменении статуса откликов</div>
              </div>
            </label>
            <label className="company-settings__option">
              <input
                type="checkbox"
                checked={moderationEmail}
                onChange={(e) => setModerationEmail(e.target.checked)}
                disabled={!emailNotifications}
              />
              <div className="company-settings__option-content">
                <div className="company-settings__option-label">Модерация вакансий</div>
                <div className="company-settings__option-desc">Уведомления о результатах модерации</div>
              </div>
            </label>
          </div>
          <div className="company-settings__section-actions">
            <button 
              className="company-settings__save-btn company-settings__save-btn--small" 
              onClick={handleSaveNotifications} 
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
              <span>Сохранить</span>
            </button>
          </div>
        </motion.div>

        {/* Privacy Settings */}
        <motion.div
          className="company-settings__section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="company-settings__section-header">
            <Shield size={20} />
            <h2>Приватность</h2>
          </div>
          <div className="company-settings__options">
            <div className="company-settings__option">
              <div className="company-settings__option-content">
                <div className="company-settings__option-label">Видимость профиля</div>
                <div className="company-settings__option-desc">Кто может видеть информацию о вашей компании</div>
              </div>
              <select 
                className="company-settings__select"
                value={profileVisibility}
                onChange={(e) => setProfileVisibility(e.target.value as any)}
              >
                <option value="public">Публичный (все пользователи)</option>
                <option value="contacts_only">Только контакты</option>
                <option value="private">Только я</option>
              </select>
            </div>
            <label className="company-settings__option">
              <input
                type="checkbox"
                checked={showContactInfo}
                onChange={(e) => setShowContactInfo(e.target.checked)}
              />
              <div className="company-settings__option-content">
                <div className="company-settings__option-label">Показывать контактную информацию</div>
                <div className="company-settings__option-desc">Студенты смогут видеть ваши контакты для связи</div>
              </div>
            </label>
          </div>
          <div className="company-settings__section-actions">
            <button 
              className="company-settings__save-btn company-settings__save-btn--small" 
              onClick={handleSavePrivacy} 
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
              <span>Сохранить</span>
            </button>
          </div>
        </motion.div>

        {/* Security Settings */}
        <motion.div
          className="company-settings__section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="company-settings__section-header">
            <Lock size={20} />
            <h2>Безопасность</h2>
          </div>
          
          {!showPasswordForm ? (
            <div className="company-settings__info">
              <Lock size={18} />
              <div>
                <p>Для защиты аккаунта рекомендуется регулярно менять пароль.</p>
                <button 
                  className="company-settings__link-btn"
                  onClick={() => setShowPasswordForm(true)}
                >
                  Изменить пароль
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="company-settings__password-form">
              <div className="company-settings__field">
                <label>Текущий пароль</label>
                <div className="company-settings__input-wrapper">
                  <Lock size={16} />
                  <input
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="company-settings__field">
                <label>Новый пароль</label>
                <div className="company-settings__input-wrapper">
                  <Lock size={16} />
                  <input
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="company-settings__field">
                <label>Подтвердите новый пароль</label>
                <div className="company-settings__input-wrapper">
                  <Lock size={16} />
                  <input
                    type="password"
                    value={passwordData.new_password_confirm}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password_confirm: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="company-settings__password-actions">
                <button 
                  type="button" 
                  className="company-settings__cancel-btn"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordData({ current_password: '', new_password: '', new_password_confirm: '' });
                  }}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="company-settings__save-btn company-settings__save-btn--small"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
                  <span>Сохранить пароль</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>

        {/* Session Info */}
        <motion.div
          className="company-settings__section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="company-settings__section-header">
            <Globe size={20} />
            <h2>Информация об аккаунте</h2>
          </div>
          <div className="company-settings__info-list">
            <div className="company-settings__info-item">
              <Mail size={16} />
              <span>Email: {user?.email}</span>
            </div>
            <div className="company-settings__info-item">
              <Phone size={16} />
              <span>Роль: {user?.role === 'company' ? 'Компания' : user?.role}</span>
            </div>
            <div className="company-settings__info-item">
              <CheckCircle size={16} />
              <span>Статус: {user?.is_email_verified ? 'Email подтвержден' : 'Email не подтвержден'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;