// frontend/src/pages/companyDashboard/FavoritesPage.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Star,
  User,
  Search,
  X,
  Eye,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  MapPin,
  Calendar,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface FavoriteStudent {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  display_name?: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  university?: string;
  faculty?: string;
  course?: number;
  graduation_year?: number;
  bio?: string;
  skills?: Array<{ id: number; name: string }>;
  saved_at: string;
}

interface CompanyContext {
  user: any;
  refreshStats: () => void;
  stats: any;
}

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { refreshStats } = useOutletContext<CompanyContext>();
  const [favorites, setFavorites] = useState<FavoriteStudent[]>([]);
  const [filteredFavorites, setFilteredFavorites] = useState<FavoriteStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [universityFilter, setUniversityFilter] = useState<string>('');
  const [universities, setUniversities] = useState<string[]>([]);

  useEffect(() => {
    fetchFavorites();
  }, []);

  useEffect(() => {
    filterFavorites();
  }, [favorites, searchQuery, universityFilter]);

  const fetchFavorites = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      // Получаем избранных студентов (эндпоинт нужно будет добавить)
      // Пока используем заглушку - реальный эндпоинт будет /api/company/favorites/students
      const response = await fetch('/api/company/favorites/students', {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      
      if (response?.ok) {
        const data = await response.json();
        setFavorites(data);
        setFilteredFavorites(data);
        
        // Собираем уникальные университеты для фильтра
        const unis = [...new Set(data.map((s: FavoriteStudent) => s.university).filter(Boolean))];
        setUniversities(unis as string[]);
      } else {
        // Демо-данные для показа
        setFavorites([]);
        setFilteredFavorites([]);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromFavorites = async (userId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/company/favorites/students/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        setFavorites(prev => prev.filter(s => s.user_id !== userId));
        refreshStats();
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  };

  const filterFavorites = () => {
    let filtered = [...favorites];
    
    if (searchQuery) {
      filtered = filtered.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.university?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (universityFilter) {
      filtered = filtered.filter(s => s.university === universityFilter);
    }
    
    setFilteredFavorites(filtered);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="company-favorites__loading">
        <div className="spinner"></div>
        <p>Загрузка избранных соискателей...</p>
      </div>
    );
  }

  return (
    <div className="company-favorites">
      <motion.div
        className="company-favorites__header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Избранные соискатели</h1>
        <p>Студенты и выпускники, которые вас заинтересовали</p>
      </motion.div>

      <div className="company-favorites__toolbar">
        <div className="company-favorites__search">
          <Search size={20} />
          <input
            type="text"
            placeholder="Поиск по имени, email или университету..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
        
        {universities.length > 0 && (
          <select
            className="company-favorites__filter"
            value={universityFilter}
            onChange={(e) => setUniversityFilter(e.target.value)}
          >
            <option value="">Все университеты</option>
            {universities.map(uni => (
              <option key={uni} value={uni}>{uni}</option>
            ))}
          </select>
        )}
      </div>

      <div className="company-favorites__stats">
        <span className="company-favorites__stats-count">
          <Star size={16} fill="#ffcc33" stroke="#ffcc33" />
          {favorites.length} избранных соискателей
        </span>
      </div>

      <div className="company-favorites__list">
        {filteredFavorites.length === 0 ? (
          <div className="company-favorites__empty">
            <div className="company-favorites__empty-icon"><Star size={48} /></div>
            <h3>Нет избранных соискателей</h3>
            <p>
              {searchQuery || universityFilter 
                ? 'Попробуйте изменить параметры поиска' 
                : 'Добавляйте в избранное студентов, которые вас заинтересовали'}
            </p>
          </div>
        ) : (
          filteredFavorites.map((student, index) => (
            <motion.div
              key={student.user_id}
              className="company-favorites__card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <div className="company-favorites__card-avatar">
                {student.avatar_url ? (
                  <img src={student.avatar_url} alt="" />
                ) : (
                  <div className="company-favorites__card-avatar-placeholder">
                    {student.first_name?.[0]}{student.last_name?.[0]}
                  </div>
                )}
              </div>
              
              <div className="company-favorites__card-info">
                <div className="company-favorites__card-header">
                  <h3 className="company-favorites__card-name">
                    {student.display_name || `${student.first_name} ${student.last_name}`}
                  </h3>
                  <button 
                    className="company-favorites__card-remove"
                    onClick={() => removeFromFavorites(student.user_id)}
                    title="Удалить из избранного"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                <div className="company-favorites__card-details">
                  <div className="company-favorites__card-detail">
                    <Mail size={12} />
                    <span>{student.email}</span>
                  </div>
                  {student.phone && (
                    <div className="company-favorites__card-detail">
                      <Phone size={12} />
                      <span>{student.phone}</span>
                    </div>
                  )}
                  {student.university && (
                    <div className="company-favorites__card-detail">
                      <GraduationCap size={12} />
                      <span>{student.university}</span>
                      {student.course && <span>, {student.course} курс</span>}
                    </div>
                  )}
                </div>
                
                {student.skills && student.skills.length > 0 && (
                  <div className="company-favorites__card-skills">
                    {student.skills.slice(0, 4).map(skill => (
                      <span key={skill.id} className="company-favorites__card-skill">{skill.name}</span>
                    ))}
                    {student.skills.length > 4 && (
                      <span className="company-favorites__card-skill-more">+{student.skills.length - 4}</span>
                    )}
                  </div>
                )}
                
                <div className="company-favorites__card-footer">
                  <div className="company-favorites__card-date">
                    <Calendar size={12} />
                    <span>Добавлен: {formatDate(student.saved_at)}</span>
                  </div>
                  <button 
                    className="company-favorites__card-btn"
                    onClick={() => navigate(`/student/user/${student.user_id}`)}
                  >
                    <Eye size={14} />
                    <span>Просмотр профиля</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;