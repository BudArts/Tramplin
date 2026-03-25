// frontend/src/pages/studentDashboard/ProfilePage.tsx
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  BookOpen,
  Calendar,
  Github,
  Globe,
  Edit2,
  Save,
  X,
  Upload,
} from 'lucide-react';
import type { UserResponse } from '../../api/types';

interface ProfilePageContext {
  user: UserResponse;
  refreshStats: () => void;
  stats: any;
}

const ProfilePage = () => {
  const { user, refreshStats } = useOutletContext<ProfilePageContext>();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserResponse>(user);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    setFormData(user);
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null;

    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', avatarFile);

    try {
      const response = await fetch(`/api/uploads/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.url;
      }
      return null;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const token = localStorage.getItem('access_token');
    if (!token) {
      setMessage({ type: 'error', text: 'Не авторизован' });
      setLoading(false);
      return;
    }

    try {
      let avatarUrl = formData.avatar_url;
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) avatarUrl = uploadedUrl;
      }

      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        patronymic: formData.patronymic,
        phone: formData.phone,
        university: formData.university,
        faculty: formData.faculty,
        course: formData.course,
        graduation_year: formData.graduation_year,
        bio: formData.bio,
        github_url: formData.github_url,
        portfolio_url: formData.portfolio_url,
        telegram: formData.telegram,
        avatar_url: avatarUrl,
      };

      const response = await fetch(`/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setFormData(updatedUser);
        setMessage({ type: 'success', text: 'Профиль успешно обновлен' });
        setIsEditing(false);
        setAvatarFile(null);
        setAvatarPreview(null);
        refreshStats();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Ошибка при обновлении профиля' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Ошибка сети' });
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setFormData(user);
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setMessage(null);
  };

  return (
    <div className="student-profile">
      <motion.div className="student-profile__header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="student-profile__title-wrapper">
          <h1>Мой профиль</h1>
          {!isEditing && (
            <button className="student-profile__edit-btn" onClick={() => setIsEditing(true)}>
              <Edit2 size={18} />
              <span>Редактировать</span>
            </button>
          )}
        </div>
        <p className="student-profile__subtitle">Управляйте личной информацией и резюме</p>
      </motion.div>

      {message && (
        <motion.div
          className={`student-profile__message student-profile__message--${message.type}`}
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

      <form onSubmit={handleSubmit} className="student-profile__form">
        <motion.div className="student-profile__avatar-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="student-profile__avatar-wrapper">
            {(avatarPreview || formData.avatar_url) ? (
              <img src={avatarPreview || formData.avatar_url} alt="Avatar" className="student-profile__avatar-img" />
            ) : (
              <div className="student-profile__avatar-placeholder">
                {`${formData.first_name?.[0]}${formData.last_name?.[0]}`.toUpperCase()}
              </div>
            )}
            {isEditing && (
              <label className="student-profile__avatar-upload">
                <Upload size={20} />
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </label>
            )}
          </div>
        </motion.div>

        <div className="student-profile__grid">
          <motion.div className="student-profile__section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="student-profile__section-header">
              <User size={20} />
              <h2>Личная информация</h2>
            </div>
            <div className="student-profile__fields">
              <div className="student-profile__field">
                <label>Имя</label>
                {isEditing ? (
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} placeholder="Имя" required />
                ) : (
                  <p>{formData.first_name || '—'}</p>
                )}
              </div>
              <div className="student-profile__field">
                <label>Фамилия</label>
                {isEditing ? (
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} placeholder="Фамилия" required />
                ) : (
                  <p>{formData.last_name || '—'}</p>
                )}
              </div>
              <div className="student-profile__field">
                <label>Отчество</label>
                {isEditing ? (
                  <input type="text" name="patronymic" value={formData.patronymic || ''} onChange={handleInputChange} placeholder="Отчество" />
                ) : (
                  <p>{formData.patronymic || '—'}</p>
                )}
              </div>
              <div className="student-profile__field">
                <label>Email</label>
                <p className="student-profile__field-email">
                  {formData.email}
                  {formData.is_email_verified && <span className="student-profile__verified-tag">Подтвержден</span>}
                </p>
              </div>
              <div className="student-profile__field">
                <label>Телефон</label>
                {isEditing ? (
                  <input type="tel" name="phone" value={formData.phone || ''} onChange={handleInputChange} placeholder="+7 (999) 123-45-67" />
                ) : (
                  <p>{formData.phone || '—'}</p>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div className="student-profile__section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="student-profile__section-header">
              <GraduationCap size={20} />
              <h2>Образование</h2>
            </div>
            <div className="student-profile__fields">
              <div className="student-profile__field">
                <label>Университет</label>
                {isEditing ? (
                  <input type="text" name="university" value={formData.university || ''} onChange={handleInputChange} placeholder="Название вуза" />
                ) : (
                  <p>{formData.university || '—'}</p>
                )}
              </div>
              <div className="student-profile__field">
                <label>Факультет</label>
                {isEditing ? (
                  <input type="text" name="faculty" value={formData.faculty || ''} onChange={handleInputChange} placeholder="Факультет" />
                ) : (
                  <p>{formData.faculty || '—'}</p>
                )}
              </div>
              <div className="student-profile__field">
                <label>Курс</label>
                {isEditing ? (
                  <input type="number" name="course" value={formData.course || ''} onChange={handleInputChange} placeholder="1-6" min={1} max={6} />
                ) : (
                  <p>{formData.course ? `${formData.course} курс` : '—'}</p>
                )}
              </div>
              <div className="student-profile__field">
                <label>Год окончания</label>
                {isEditing ? (
                  <input type="number" name="graduation_year" value={formData.graduation_year || ''} onChange={handleInputChange} placeholder="2026" />
                ) : (
                  <p>{formData.graduation_year || '—'}</p>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div className="student-profile__section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="student-profile__section-header">
              <BookOpen size={20} />
              <h2>О себе</h2>
            </div>
            <div className="student-profile__fields">
              <div className="student-profile__field">
                <label>Биография</label>
                {isEditing ? (
                  <textarea name="bio" value={formData.bio || ''} onChange={handleInputChange} placeholder="Расскажите о себе, ваших интересах и целях..." rows={4} />
                ) : (
                  <p className="student-profile__bio">{formData.bio || '—'}</p>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div className="student-profile__section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="student-profile__section-header">
              <Globe size={20} />
              <h2>Портфолио и ссылки</h2>
            </div>
            <div className="student-profile__fields">
              <div className="student-profile__field">
                <label>GitHub</label>
                {isEditing ? (
                  <input type="url" name="github_url" value={formData.github_url || ''} onChange={handleInputChange} placeholder="https://github.com/username" />
                ) : (
                  formData.github_url ? <a href={formData.github_url} target="_blank" rel="noopener noreferrer" className="student-profile__link">{formData.github_url}</a> : <p>—</p>
                )}
              </div>
              <div className="student-profile__field">
                <label>Портфолио</label>
                {isEditing ? (
                  <input type="url" name="portfolio_url" value={formData.portfolio_url || ''} onChange={handleInputChange} placeholder="https://portfolio.com" />
                ) : (
                  formData.portfolio_url ? <a href={formData.portfolio_url} target="_blank" rel="noopener noreferrer" className="student-profile__link">{formData.portfolio_url}</a> : <p>—</p>
                )}
              </div>
              <div className="student-profile__field">
                <label>Telegram</label>
                {isEditing ? (
                  <input type="text" name="telegram" value={formData.telegram || ''} onChange={handleInputChange} placeholder="@username" />
                ) : (
                  <p>{formData.telegram || '—'}</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {isEditing && (
          <motion.div className="student-profile__actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <button type="button" className="student-profile__cancel-btn" onClick={cancelEdit} disabled={loading}>
              <X size={18} />
              <span>Отмена</span>
            </button>
            <button type="submit" className="student-profile__save-btn" disabled={loading}>
              {loading ? <div className="spinner"></div> : <><Save size={18} /><span>Сохранить изменения</span></>}
            </button>
          </motion.div>
        )}
      </form>
    </div>
  );
};

export default ProfilePage;