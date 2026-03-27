// frontend/src/pages/curatorDashboard/SettingsPage.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Settings, Save, Shield, Users, Bell, Lock, Globe } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface CuratorContext {
  user: any;
  refreshStats: () => void;
  stats: any;
}

const SettingsPage = () => {
  const { user, refreshStats } = useOutletContext<CuratorContext>();
  const { loadUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    const token = localStorage.getItem('access_token');

    try {
      const response = await fetch(`/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notification_preferences: {
            email: emailNotifications,
            push: notificationsEnabled,
          },
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Настройки сохранены' });
        refreshStats();
        await loadUser();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Ошибка при сохранении настроек' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Ошибка сети' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="curator-settings">
      <motion.div
        className="curator-settings__header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="curator-settings__title-wrapper">
          <Settings size={28} />
          <h1>Настройки</h1>
        </div>
        <p>Управление уведомлениями и настройками аккаунта</p>
      </motion.div>

      {message && (
        <motion.div
          className={`curator-settings__message curator-settings__message--${message.type}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {message.text}
        </motion.div>
      )}

      <div className="curator-settings__grid">
        <motion.div
          className="curator-settings__section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="curator-settings__section-header">
            <Bell size={20} />
            <h2>Уведомления</h2>
          </div>
          <div className="curator-settings__options">
            <label className="curator-settings__option">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
              />
              <div className="curator-settings__option-content">
                <div className="curator-settings__option-label">Push-уведомления</div>
                <div className="curator-settings__option-desc">Получать уведомления в браузере</div>
              </div>
            </label>
            <label className="curator-settings__option">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              <div className="curator-settings__option-content">
                <div className="curator-settings__option-label">Email-уведомления</div>
                <div className="curator-settings__option-desc">Получать уведомления на почту</div>
              </div>
            </label>
          </div>
        </motion.div>

        <motion.div
          className="curator-settings__section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="curator-settings__section-header">
            <Shield size={20} />
            <h2>Безопасность</h2>
          </div>
          <div className="curator-settings__info">
            <p>Для изменения пароля обратитесь к администратору системы.</p>
          </div>
        </motion.div>
      </div>

      <motion.div
        className="curator-settings__actions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <button className="curator-settings__save-btn" onClick={handleSave} disabled={loading}>
          {loading ? (
            <>
              <div className="spinner-small"></div>
              <span>Сохранение...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Сохранить настройки</span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
};

export default SettingsPage;