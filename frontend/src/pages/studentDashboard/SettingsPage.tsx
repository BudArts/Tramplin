// frontend/src/pages/studentDashboard/SettingsPage.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { 
  Settings, Eye, EyeOff, Globe, Lock, Shield, Save, Users, 
  HelpCircle, Trash2, Key, Mail, Bell, MessageSquare, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import SupportModal from '../../components/SupportModal';
import DeleteAccountModal from '../../components/DeleteAccountModal';
import PasswordResetModal from '../../components/PasswordResetModal';

interface UserData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  profile_privacy?: 'public' | 'contacts_only' | 'private';
  resume_privacy?: 'public' | 'contacts_only' | 'private';
}

interface SettingsPageContext {
  user: UserData;
  refreshStats: () => void;
  refreshUser: () => void;
}

const SettingsPage = () => {
  const { user, refreshStats, refreshUser } = useOutletContext<SettingsPageContext>();
  const { loadUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profilePrivacy, setProfilePrivacy] = useState<'public' | 'contacts_only' | 'private'>(
    user.profile_privacy || 'public'
  );
  const [resumePrivacy, setResumePrivacy] = useState<'public' | 'contacts_only' | 'private'>(
    user.resume_privacy || 'public'
  );
  
  // Модальные окна
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [passwordResetModalOpen, setPasswordResetModalOpen] = useState(false);

  const privacyOptions = [
    { value: 'public', label: 'Все авторизованные пользователи', icon: Globe, description: 'Ваш профиль виден всем зарегистрированным пользователям' },
    { value: 'contacts_only', label: 'Только мои контакты', icon: Users, description: 'Только добавленные вами контакты могут видеть ваш профиль' },
    { value: 'private', label: 'Только я', icon: Lock, description: 'Никто, кроме вас, не видит ваш профиль' },
  ];

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
          profile_privacy: profilePrivacy,
          resume_privacy: resumePrivacy,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Настройки приватности сохранены' });
        refreshStats();
        refreshUser();
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
    <div className="student-settings">
      <motion.div className="student-settings__header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="student-settings__title-wrapper">
          <Settings size={28} />
          <h1>Настройки</h1>
        </div>
        <p>Управляйте приватностью, безопасностью и другими параметрами</p>
      </motion.div>

      {message && (
        <motion.div
          className={`student-settings__message student-settings__message--${message.type}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {message.type === 'success' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {message.text}
        </motion.div>
      )}

      <div className="student-settings__grid">
        {/* Приватность профиля */}
        <motion.div
          className="student-settings__section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="student-settings__section-header">
            <Eye size={20} />
            <h2>Видимость профиля</h2>
          </div>
          <p className="student-settings__section-desc">
            Кто может видеть вашу личную информацию, образование и портфолио
          </p>
          <div className="student-settings__options">
            {privacyOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = profilePrivacy === option.value;
              return (
                <button
                  key={option.value}
                  className={`student-settings__option ${isSelected ? 'selected' : ''}`}
                  onClick={() => setProfilePrivacy(option.value as typeof profilePrivacy)}
                >
                  <div className="student-settings__option-icon">
                    <Icon size={20} />
                  </div>
                  <div className="student-settings__option-content">
                    <div className="student-settings__option-label">{option.label}</div>
                    <div className="student-settings__option-desc">{option.description}</div>
                  </div>
                  {isSelected && (
                    <div className="student-settings__option-check">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Приватность резюме */}
        <motion.div
          className="student-settings__section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="student-settings__section-header">
            <EyeOff size={20} />
            <h2>Видимость резюме</h2>
          </div>
          <p className="student-settings__section-desc">
            Кто может видеть ваше резюме, ссылки на проекты и опыт работы
          </p>
          <div className="student-settings__options">
            {privacyOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = resumePrivacy === option.value;
              return (
                <button
                  key={option.value}
                  className={`student-settings__option ${isSelected ? 'selected' : ''}`}
                  onClick={() => setResumePrivacy(option.value as typeof resumePrivacy)}
                >
                  <div className="student-settings__option-icon">
                    <Icon size={20} />
                  </div>
                  <div className="student-settings__option-content">
                    <div className="student-settings__option-label">{option.label}</div>
                    <div className="student-settings__option-desc">{option.description}</div>
                  </div>
                  {isSelected && (
                    <div className="student-settings__option-check">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Безопасность */}
        <motion.div
          className="student-settings__section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="student-settings__section-header">
            <Shield size={20} />
            <h2>Безопасность</h2>
          </div>
          <div className="student-settings__actions-list">
            <button
              className="student-settings__action-btn"
              onClick={() => setPasswordResetModalOpen(true)}
            >
              <Key size={18} />
              <div className="student-settings__action-content">
                <span className="student-settings__action-title">Сменить пароль</span>
                <span className="student-settings__action-desc">
                  Обновите пароль для входа в аккаунт
                </span>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button
              className="student-settings__action-btn"
              onClick={() => setSupportModalOpen(true)}
            >
              <HelpCircle size={18} />
              <div className="student-settings__action-content">
                <span className="student-settings__action-title">Служба поддержки</span>
                <span className="student-settings__action-desc">
                  Задать вопрос или сообщить о проблеме
                </span>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </motion.div>

        {/* Опасная зона */}
        <motion.div
          className="student-settings__section student-settings__section--danger"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="student-settings__section-header">
            <AlertTriangle size={20} />
            <h2>Опасная зона</h2>
          </div>
          <p className="student-settings__section-desc">
            Действия, которые нельзя отменить
          </p>
          <div className="student-settings__actions-list">
            <button
              className="student-settings__action-btn student-settings__action-btn--danger"
              onClick={() => setDeleteModalOpen(true)}
            >
              <Trash2 size={18} />
              <div className="student-settings__action-content">
                <span className="student-settings__action-title">Удалить аккаунт</span>
                <span className="student-settings__action-desc">
                  Безвозвратное удаление всех данных
                </span>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </motion.div>
      </div>

      <motion.div
        className="student-settings__actions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <button className="student-settings__save-btn" onClick={handleSave} disabled={loading}>
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

      <motion.div
        className="student-settings__info"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Shield size={16} />
        <p>
          Ваши данные защищены. Работодатели видят только ту информацию, которую вы разрешили показывать.
          Для просмотра вакансий и откликов настройки приватности не влияют.
        </p>
      </motion.div>

      {/* Модальные окна */}
      <SupportModal isOpen={supportModalOpen} onClose={() => setSupportModalOpen(false)} />
      <DeleteAccountModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} />
      <PasswordResetModal isOpen={passwordResetModalOpen} onClose={() => setPasswordResetModalOpen(false)} mode="request" />
    </div>
  );
};

export default SettingsPage;