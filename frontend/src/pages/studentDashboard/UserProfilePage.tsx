// frontend/src/pages/studentDashboard/UserProfilePage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, Mail, Phone, GraduationCap, BookOpen, Calendar, 
  Github, Globe, ArrowLeft, MessageCircle, Briefcase, MapPin, Building2, Check
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  patronymic?: string;
  display_name?: string;
  phone?: string;
  university?: string;
  faculty?: string;
  course?: number;
  graduation_year?: number;
  bio?: string;
  avatar_url?: string;
  github_url?: string;
  portfolio_url?: string;
  telegram?: string;
  role?: string;
}

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isContact, setIsContact] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
      checkIsContact();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        console.error('Failed to fetch user profile:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIsContact = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    try {
      const response = await fetch('/api/contacts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const isInContacts = data.items?.some(
          (contact: any) => 
            contact.user.id === parseInt(userId!) || 
            contact.contact.id === parseInt(userId!)
        );
        setIsContact(isInContacts);
      }
    } catch (error) {
      console.error('Error checking contact:', error);
    }
  };

  const sendMessage = () => {
    navigate(`/student/chat/${userId}`);
  };

  const getUserDisplayName = () => {
    if (!profile) return '';
    if (profile.display_name) return profile.display_name;
    return `${profile.first_name} ${profile.last_name}`.trim();
  };

  const getInitials = () => {
    if (!profile) return '?';
    return (profile.first_name?.[0] || '') + (profile.last_name?.[0] || '');
  };

  if (loading) {
    return (
      <div className="user-profile__loading">
        <div className="spinner"></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="user-profile__not-found">
        <div className="container">
          <h2>Пользователь не найден</h2>
          <button onClick={() => navigate('/student/contacts')}>Вернуться к контактам</button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div className="student-profile-page">
      <div className="student-profile-page__header">
        <div className="container">
          <button className="student-profile-page__back" onClick={() => navigate('/student/contacts')}>
            <ArrowLeft size={20} />
            <span>Назад к контактам</span>
          </button>
          <h1>{isOwnProfile ? 'Мой профиль' : 'Профиль пользователя'}</h1>
        </div>
      </div>

      <div className="container student-profile-page__container">
        <div className="student-profile-page__content">
          <div className="student-profile-page__avatar-card">
            <div className="student-profile-page__avatar">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={getUserDisplayName()} />
              ) : (
                <div className="student-profile-page__avatar-placeholder">{getInitials()}</div>
              )}
            </div>
            <h2>{getUserDisplayName()}</h2>
            {profile.role && (
              <p className="student-profile-page__role">
                {profile.role === 'student' ? 'Студент' : profile.role === 'company' ? 'Представитель компании' : 'Пользователь'}
              </p>
            )}
            {profile.university && (
              <p className="student-profile-page__university">
                <GraduationCap size={16} />
                {profile.university} {profile.course ? `• ${profile.course} курс` : ''}
              </p>
            )}
            <div className="student-profile-page__actions">
              {isContact && !isOwnProfile && (
                <button className="student-profile-page__message-btn" onClick={sendMessage}>
                  <MessageCircle size={18} />
                  <span>Написать сообщение</span>
                </button>
              )}
              {isOwnProfile && (
                <button className="student-profile-page__edit-btn" onClick={() => navigate('/student/profile')}>
                  <User size={18} />
                  <span>Редактировать профиль</span>
                </button>
              )}
            </div>
          </div>

          <div className="student-profile-page__info">
            <div className="student-profile-page__section">
              <div className="student-profile-page__section-header">
                <User size={20} />
                <h3>Контактная информация</h3>
              </div>
              <div className="student-profile-page__fields">
                {profile.email && (
                  <div className="student-profile-page__field">
                    <label>Email</label>
                    <p><Mail size={14} /> {profile.email}</p>
                  </div>
                )}
                {profile.phone && (
                  <div className="student-profile-page__field">
                    <label>Телефон</label>
                    <p><Phone size={14} /> {profile.phone}</p>
                  </div>
                )}
                {profile.telegram && (
                  <div className="student-profile-page__field">
                    <label>Telegram</label>
                    <p>@{profile.telegram}</p>
                  </div>
                )}
              </div>
            </div>

            {(profile.university || profile.faculty || profile.course || profile.graduation_year) && (
              <div className="student-profile-page__section">
                <div className="student-profile-page__section-header">
                  <GraduationCap size={20} />
                  <h3>Образование</h3>
                </div>
                <div className="student-profile-page__fields">
                  {profile.university && (
                    <div className="student-profile-page__field">
                      <label>Университет</label>
                      <p>{profile.university}</p>
                    </div>
                  )}
                  {profile.faculty && (
                    <div className="student-profile-page__field">
                      <label>Факультет</label>
                      <p>{profile.faculty}</p>
                    </div>
                  )}
                  {profile.course && (
                    <div className="student-profile-page__field">
                      <label>Курс</label>
                      <p>{profile.course}</p>
                    </div>
                  )}
                  {profile.graduation_year && (
                    <div className="student-profile-page__field">
                      <label>Год окончания</label>
                      <p>{profile.graduation_year}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {profile.bio && (
              <div className="student-profile-page__section">
                <div className="student-profile-page__section-header">
                  <BookOpen size={20} />
                  <h3>О себе</h3>
                </div>
                <p className="student-profile-page__bio">{profile.bio}</p>
              </div>
            )}

            {(profile.github_url || profile.portfolio_url) && (
              <div className="student-profile-page__section">
                <div className="student-profile-page__section-header">
                  <Globe size={20} />
                  <h3>Ссылки и портфолио</h3>
                </div>
                <div className="student-profile-page__links">
                  {profile.github_url && (
                    <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="student-profile-page__link">
                      <Github size={16} />
                      GitHub
                    </a>
                  )}
                  {profile.portfolio_url && (
                    <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="student-profile-page__link">
                      <Globe size={16} />
                      Портфолио
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;