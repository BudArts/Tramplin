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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    setFormData(user);
    if (user.avatar_url) {
      setAvatarPreview(user.avatar_url);
    }
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

    setUploadingAvatar(true);
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', avatarFile);

    try {
      const response = await fetch('/api/uploads/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Avatar uploaded:', data.url);
        return data.url;
      }
      return null;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    } finally {
      setUploadingAvatar(false);
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
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        } else {
          setMessage({ type: 'error', text: 'Не удалось загрузить аватар' });
          setLoading(false);
          return;
        }
      }

      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        patronymic: formData.patronymic || null,
        phone: formData.phone || null,
        university: formData.university || null,
        faculty: formData.faculty || null,
        course: formData.course || null,
        graduation_year: formData.graduation_year || null,
        bio: formData.bio || null,
        github_url: formData.github_url || null,
        portfolio_url: formData.portfolio_url || null,
        telegram: formData.telegram || null,
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

      const responseData = await response.json();

      if (response.ok) {
        // Обновляем локальное состояние
        setFormData(responseData);
        setMessage({ type: 'success', text: 'Профиль успешно обновлен' });
        setIsEditing(false);
        setAvatarFile(null);
        
        // Сохраняем URL аватара из ответа или из того, что отправили
        const newAvatarUrl = responseData.avatar_url || avatarUrl;
        if (newAvatarUrl) {
          setAvatarPreview(newAvatarUrl);
          // Обновляем user в контексте через refreshStats
          refreshStats();
        }
        
        // Обновляем localStorage
        const storedUserStr = localStorage.getItem('user');
        if (storedUserStr) {
          const storedUser = JSON.parse(storedUserStr);
          storedUser.avatar_url = newAvatarUrl;
          localStorage.setItem('user', JSON.stringify(storedUser));
        }
      } else {
        setMessage({ type: 'error', text: responseData.detail || 'Ошибка при обновлении профиля' });
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
    setAvatarPreview(user.avatar_url || null);
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
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="student-profile__avatar-img"
              />
            ) : (
              <div className="student-profile__avatar-placeholder">
                {`${formData.first_name?.[0]}${formData.last_name?.[0]}`.toUpperCase()}
              </div>
            )}
            {isEditing && (
              <label className="student-profile__avatar-upload">
                {uploadingAvatar ? (
                  <div className="spinner-small"></div>
                ) : (
                  <Upload size={20} />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                  disabled={uploadingAvatar}
                />
              </label>
            )}
          </div>
        </motion.div>

        <div className="student-profile__grid">
          {/* Личная информация */}
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

          {/* Остальные секции без изменений... */}
        </div>

        {isEditing && (
          <motion.div className="student-profile__actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <button type="button" className="student-profile__cancel-btn" onClick={cancelEdit} disabled={loading || uploadingAvatar}>
              <X size={18} />
              <span>Отмена</span>
            </button>
            <button type="submit" className="student-profile__save-btn" disabled={loading || uploadingAvatar}>
              {loading || uploadingAvatar ? <div className="spinner"></div> : <><Save size={18} /><span>Сохранить изменения</span></>}
            </button>
          </motion.div>
        )}
      </form>
    </div>
  );
};

export default ProfilePage;