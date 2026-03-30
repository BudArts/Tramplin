// frontend/src/pages/companyDashboard/OpportunityForm.tsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Upload,
  MapPin,
  Calendar,
  Tag,
  Map,
} from 'lucide-react';

interface Opportunity {
  id?: number;
  title: string;
  description: string;
  type: 'internship' | 'vacancy' | 'mentorship' | 'event';
  work_format: 'office' | 'hybrid' | 'remote';
  salary_min?: number;
  salary_max?: number;
  city: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  expires_at?: string;
  event_date?: string;
  contact_email?: string;
  contact_phone?: string;
  external_url?: string;
  tag_ids: number[];
  tags?: Array<{ id: number; name: string }>;
}

interface Tag {
  id: number;
  name: string;
  category: string;
  is_approved: boolean;
}

interface OpportunityFormProps {
  opportunity?: Opportunity | null;
  onClose: () => void;
  onSuccess: () => void;
}

const OpportunityForm = ({ opportunity, onClose, onSuccess }: OpportunityFormProps) => {
  const [formData, setFormData] = useState<Opportunity>({
    title: '',
    description: '',
    type: 'vacancy',
    work_format: 'office',
    city: '',
    tag_ids: [],
    ...opportunity,
  });
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<Tag[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!opportunity?.id;

  useEffect(() => {
    if (formData.latitude || formData.longitude) {
      setShowCoordinates(true);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    if (tagSearch.length > 1) {
      suggestTags();
    } else {
      setSuggestedTags([]);
    }
  }, [tagSearch]);

  const fetchTags = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch('/api/tags?approved_only=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const suggestTags = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/tags/suggest?q=${encodeURIComponent(tagSearch)}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSuggestedTags(data.filter((tag: Tag) => !formData.tag_ids.includes(tag.id)));
      }
    } catch (error) {
      console.error('Error suggesting tags:', error);
    }
  };

  const addTag = (tag: Tag) => {
    if (!formData.tag_ids.includes(tag.id)) {
      setFormData({
        ...formData,
        tag_ids: [...formData.tag_ids, tag.id],
        tags: [...(formData.tags || []), { id: tag.id, name: tag.name }],
      });
    }
    setTagSearch('');
    setShowTagSuggestions(false);
    tagInputRef.current?.focus();
  };

  const removeTag = (tagId: number) => {
    setFormData({
      ...formData,
      tag_ids: formData.tag_ids.filter(id => id !== tagId),
      tags: (formData.tags || []).filter(tag => tag.id !== tagId),
    });
  };

  const proposeNewTag = async () => {
    if (!tagSearch.trim()) return;
    
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: tagSearch.trim(), category: 'custom' }),
      });

      if (response.ok) {
        const newTag = await response.json();
        addTag(newTag);
      } else {
        alert('Не удалось предложить тег. Возможно, он уже существует.');
      }
    } catch (error) {
      console.error('Error proposing tag:', error);
    }
  };

  const uploadMedia = async (file: File) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setUploadingMedia(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await fetch('/api/uploads/image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataUpload,
      });

      if (response.ok) {
        const data = await response.json();
        setMediaUrls([...mediaUrls, data.url]);
      }
    } catch (error) {
      console.error('Error uploading media:', error);
    } finally {
      setUploadingMedia(false);
    }
  };

  const removeMedia = (url: string) => {
    setMediaUrls(mediaUrls.filter(u => u !== url));
  };

  const geocodeAddress = async () => {
    if (!formData.city) {
      alert('Сначала заполните город');
      return;
    }
    
    const fullAddress = formData.address 
      ? `${formData.city}, ${formData.address}`
      : formData.city;
    
    setGeocoding(true);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        setFormData({
          ...formData,
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        });
        alert(`Координаты определены: ${data[0].lat}, ${data[0].lon}`);
      } else {
        alert('Не удалось определить координаты по адресу. Попробуйте указать более точный адрес.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Ошибка при определении координат');
    } finally {
      setGeocoding(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) newErrors.title = 'Название обязательно';
    if (!formData.description.trim()) newErrors.description = 'Описание обязательно';
    if (!formData.city.trim()) newErrors.city = 'Город обязателен';
    
    // Валидация координат
    if (formData.latitude !== undefined && (formData.latitude < -90 || formData.latitude > 90)) {
      newErrors.latitude = 'Широта должна быть от -90 до 90';
    }
    if (formData.longitude !== undefined && (formData.longitude < -180 || formData.longitude > 180)) {
      newErrors.longitude = 'Долгота должна быть от -180 до 180';
    }
    
    // Валидация зарплаты
    if (formData.salary_min && formData.salary_max && formData.salary_min > formData.salary_max) {
      newErrors.salary = 'Минимальная зарплата не может быть больше максимальной';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setLoading(true);
  const token = localStorage.getItem('access_token');
  if (!token) {
    setLoading(false);
    return;
  }

  // Получаем текущего пользователя из localStorage
  const storedUser = localStorage.getItem('user');
  let companyId = null;
  
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      companyId = user.company_id;
      console.log('Company ID from user:', companyId);
    } catch (e) {
      console.error('Error parsing user:', e);
    }
  }

  // Если company_id нет в user, пробуем получить через API
  if (!companyId) {
    try {
      const userResponse = await fetch('/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        companyId = userData.company_id;
        console.log('Company ID from API:', companyId);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }

  if (!companyId) {
    alert('Компания не найдена. Пожалуйста, убедитесь, что ваш аккаунт привязан к компании.');
    setLoading(false);
    return;
  }

  // Подготавливаем данные для отправки
  const submitData = {
    title: formData.title,
    description: formData.description,
    type: formData.type,
    work_format: formData.work_format,
    salary_min: formData.salary_min && formData.salary_min > 0 ? formData.salary_min : null,
    salary_max: formData.salary_max && formData.salary_max > 0 ? formData.salary_max : null,
    city: formData.city,
    address: formData.address || null,
    latitude: formData.latitude !== undefined && formData.latitude !== null ? formData.latitude : null,
    longitude: formData.longitude !== undefined && formData.longitude !== null ? formData.longitude : null,
    expires_at: formData.expires_at || null,
    event_date: formData.event_date || null,
    tag_ids: formData.tag_ids.filter(id => id > 0),
    contact_email: formData.contact_email || null,
    contact_phone: formData.contact_phone || null,
    external_url: formData.external_url || null,
    company_id: companyId, // Добавляем company_id
  };

  try {
    const url = isEditing 
      ? `/api/opportunities/${formData.id}`
      : '/api/opportunities';
    const method = isEditing ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(submitData),
    });

    if (response.ok) {
      onSuccess();
    } else {
      const error = await response.json();
      console.error('Validation error:', error);
      alert(error.detail || 'Ошибка при сохранении');
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    alert('Ошибка сети');
  } finally {
    setLoading(false);
  }
};
  const typeOptions = [
    { value: 'vacancy', label: 'Вакансия', description: 'Полная занятость, работа на постоянной основе' },
    { value: 'internship', label: 'Стажировка', description: 'Временная занятость для студентов и выпускников' },
    { value: 'mentorship', label: 'Менторство', description: 'Программа наставничества' },
    { value: 'event', label: 'Мероприятие', description: 'День открытых дверей, хакатон, лекция' },
  ];

  const formatOptions = [
    { value: 'office', label: 'Офис', icon: '🏢' },
    { value: 'hybrid', label: 'Гибрид', icon: '💻🏢' },
    { value: 'remote', label: 'Удаленно', icon: '🏠' },
  ];

  return (
    <motion.div
      className="company-modal__backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="company-modal__content company-modal__content--large company-opportunity-form"
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        onClick={e => e.stopPropagation()}
      >
        <button className="company-modal__close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="company-opportunity-form__header">
          <h2>{isEditing ? 'Редактирование вакансии' : 'Создание новой вакансии'}</h2>
          <p>Заполните информацию о вакансии. После создания она будет отправлена на модерацию.</p>
        </div>

        <form onSubmit={handleSubmit} className="company-opportunity-form__form">
          {/* Основная информация */}
          <div className="company-opportunity-form__section">
            <h3>Основная информация</h3>
            
            <div className="company-opportunity-form__field">
              <label>Название вакансии *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Например: Junior Frontend Developer"
              />
              {errors.title && <span className="company-opportunity-form__error">{errors.title}</span>}
            </div>

            <div className="company-opportunity-form__field">
              <label>Тип вакансии *</label>
              <div className="company-opportunity-form__type-selector">
                {typeOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={`company-opportunity-form__type-option ${formData.type === option.value ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, type: option.value as any })}
                  >
                    <span className="company-opportunity-form__type-label">{option.label}</span>
                    <span className="company-opportunity-form__type-desc">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="company-opportunity-form__field">
              <label>Описание *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Опишите обязанности, требования к кандидату, условия работы..."
                rows={8}
              />
              {errors.description && <span className="company-opportunity-form__error">{errors.description}</span>}
            </div>
          </div>

          {/* Формат и локация */}
          <div className="company-opportunity-form__section">
            <h3>Формат работы и локация</h3>
            
            <div className="company-opportunity-form__row">
              <div className="company-opportunity-form__field">
                <label>Формат работы *</label>
                <div className="company-opportunity-form__format-selector">
                  {formatOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`company-opportunity-form__format-option ${formData.work_format === option.value ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, work_format: option.value as any })}
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="company-opportunity-form__field">
                <label>Город *</label>
                <div className="company-opportunity-form__input-with-icon">
                  <MapPin size={18} />
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Например: Москва"
                  />
                </div>
                {errors.city && <span className="company-opportunity-form__error">{errors.city}</span>}
              </div>
            </div>

            <div className="company-opportunity-form__field">
              <label>Адрес (для офисных вакансий)</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Улица, дом"
              />
            </div>
          </div>

          {/* Координаты на карте */}
          <div className="company-opportunity-form__section">
            <div className="company-opportunity-form__section-header">
              <Map size={18} />
              <h3>Местоположение на карте</h3>
            </div>
            
            <div className="company-opportunity-form__field">
              <label className="company-opportunity-form__checkbox-label">
                <input
                  type="checkbox"
                  checked={showCoordinates}
                  onChange={(e) => setShowCoordinates(e.target.checked)}
                />
                <span>Указать точные координаты</span>
              </label>
              <p className="company-opportunity-form__hint">
                Координаты нужны для отображения вакансии на карте. Если не указать, будет отображаться только город.
              </p>
            </div>
            
            {showCoordinates && (
              <div className="company-opportunity-form__coordinates-panel">
                <div className="company-opportunity-form__row">
                  <div className="company-opportunity-form__field">
                    <label>Широта (latitude)</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formData.latitude || ''}
                      onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || undefined })}
                      placeholder="55.751244"
                    />
                    {errors.latitude && <span className="company-opportunity-form__error">{errors.latitude}</span>}
                  </div>
                  <div className="company-opportunity-form__field">
                    <label>Долгота (longitude)</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formData.longitude || ''}
                      onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || undefined })}
                      placeholder="37.618423"
                    />
                    {errors.longitude && <span className="company-opportunity-form__error">{errors.longitude}</span>}
                  </div>
                </div>
                
                <button
                  type="button"
                  className="company-opportunity-form__geocode-btn"
                  onClick={geocodeAddress}
                  disabled={geocoding}
                >
                  {geocoding ? (
                    <Loader2 size={16} className="spinner" />
                  ) : (
                    <MapPin size={16} />
                  )}
                  <span>Определить координаты по адресу</span>
                </button>
                
                <div className="company-opportunity-form__map-note">
                  <AlertCircle size={14} />
                  <span>
                    💡 Как получить координаты: откройте <a href="https://yandex.ru/maps" target="_blank" rel="noopener noreferrer">Яндекс.Карты</a> или 
                    <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer"> Google Maps</a>, найдите нужное место, 
                    кликните правой кнопкой мыши и выберите "Что здесь?" — координаты появятся внизу.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Зарплата */}
          <div className="company-opportunity-form__section">
            <h3>Зарплата</h3>
            <div className="company-opportunity-form__row">
              <div className="company-opportunity-form__field">
                <label>Минимальная зарплата</label>
                <input
                  type="number"
                  value={formData.salary_min || ''}
                  onChange={(e) => setFormData({ ...formData, salary_min: parseInt(e.target.value) || undefined })}
                  placeholder="₽"
                />
              </div>
              <div className="company-opportunity-form__field">
                <label>Максимальная зарплата</label>
                <input
                  type="number"
                  value={formData.salary_max || ''}
                  onChange={(e) => setFormData({ ...formData, salary_max: parseInt(e.target.value) || undefined })}
                  placeholder="₽"
                />
              </div>
            </div>
            {errors.salary && <span className="company-opportunity-form__error">{errors.salary}</span>}
          </div>

          {/* Даты */}
          <div className="company-opportunity-form__section">
            <h3>Сроки</h3>
            <div className="company-opportunity-form__row">
              {formData.type === 'event' ? (
                <div className="company-opportunity-form__field">
                  <label>Дата проведения мероприятия</label>
                  <div className="company-opportunity-form__input-with-icon">
                    <Calendar size={18} />
                    <input
                      type="date"
                      value={formData.event_date || ''}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="company-opportunity-form__field">
                  <label>Дата окончания приема заявок</label>
                  <div className="company-opportunity-form__input-with-icon">
                    <Calendar size={18} />
                    <input
                      type="date"
                      value={formData.expires_at || ''}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Теги - не обязательные */}
          <div className="company-opportunity-form__section">
            <h3>Навыки и технологии (необязательно)</h3>
            <div className="company-opportunity-form__tags">
              <div className="company-opportunity-form__selected-tags">
                {(formData.tags || []).map(tag => (
                  <div key={tag.id} className="company-opportunity-form__tag">
                    <Tag size={12} />
                    <span>{tag.name}</span>
                    <button type="button" onClick={() => removeTag(tag.id)}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="company-opportunity-form__tag-input">
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagSearch}
                  onChange={(e) => {
                    setTagSearch(e.target.value);
                    setShowTagSuggestions(true);
                  }}
                  onFocus={() => setShowTagSuggestions(true)}
                  placeholder="Введите название навыка..."
                />
                {showTagSuggestions && (tagSearch.length > 1 || suggestedTags.length > 0) && (
                  <div className="company-opportunity-form__tag-suggestions">
                    {suggestedTags.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => addTag(tag)}
                      >
                        <Tag size={12} />
                        <span>{tag.name}</span>
                        <span className="company-opportunity-form__tag-category">
                          {tag.category === 'technology' ? 'технология' : 
                           tag.category === 'level' ? 'уровень' : 
                           tag.category === 'employment_type' ? 'тип занятости' : 'тег'}
                        </span>
                      </button>
                    ))}
                    {tagSearch.length > 1 && !suggestedTags.some(t => t.name.toLowerCase() === tagSearch.toLowerCase()) && (
                      <button
                        type="button"
                        className="company-opportunity-form__suggest-new"
                        onClick={proposeNewTag}
                      >
                        <Plus size={12} />
                        <span>Предложить тег "{tagSearch}"</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="company-opportunity-form__hint">Добавление тегов поможет студентам найти вашу вакансию</p>
          </div>

          {/* Медиафайлы */}
          <div className="company-opportunity-form__section">
            <h3>Медиафайлы</h3>
            <div className="company-opportunity-form__media">
              {mediaUrls.map((url, index) => (
                <div key={index} className="company-opportunity-form__media-item">
                  <img src={url} alt={`Медиа ${index + 1}`} />
                  <button type="button" onClick={() => removeMedia(url)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <label className="company-opportunity-form__media-upload">
                <Upload size={24} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) uploadMedia(e.target.files[0]);
                  }}
                  disabled={uploadingMedia}
                />
                {uploadingMedia && <Loader2 size={20} className="spinner" />}
              </label>
            </div>
            <p className="company-opportunity-form__hint">Добавьте фото офиса, логотип или другие изображения</p>
          </div>

          {/* Контактная информация */}
          <div className="company-opportunity-form__section">
            <h3>Контактная информация</h3>
            <div className="company-opportunity-form__row">
              <div className="company-opportunity-form__field">
                <label>Контактный email</label>
                <input
                  type="email"
                  value={formData.contact_email || ''}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="company-opportunity-form__field">
                <label>Контактный телефон</label>
                <input
                  type="tel"
                  value={formData.contact_phone || ''}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="+7 (XXX) XXX-XX-XX"
                />
              </div>
            </div>
            <div className="company-opportunity-form__field">
              <label>Внешняя ссылка</label>
              <input
                type="url"
                value={formData.external_url || ''}
                onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="company-opportunity-form__actions">
            <button type="button" className="company-opportunity-form__cancel" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="company-opportunity-form__submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>{isEditing ? 'Сохранить изменения' : 'Создать вакансию'}</span>
                </>
              )}
            </button>
          </div>

          <div className="company-opportunity-form__info">
            <AlertCircle size={14} />
            <span>После создания вакансия будет отправлена на модерацию куратором платформы.</span>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default OpportunityForm;