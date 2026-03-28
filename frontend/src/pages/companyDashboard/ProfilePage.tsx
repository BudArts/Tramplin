// frontend/src/pages/companyDashboard/ProfilePage.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Edit2,
  Save,
  X,
  Loader2,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  Plus,
  Trash2,
  User,
} from 'lucide-react';

interface Company {
  id: number;
  inn: string;
  ogrn?: string;
  name?: string;
  full_name: string;
  short_name?: string;
  brand_name?: string;
  display_name?: string;
  legal_address?: string;
  actual_address?: string;
  city?: string;
  email: string;
  phone?: string;
  website?: string;
  status: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  is_email_verified: boolean;
  description?: string;
  industry?: string;
  logo_url?: string;
  cover_url?: string;
  employee_count?: number;
  founded_year?: number;
  social_links?: string[];
  created_at?: string;
}

interface ResponsiblePerson {
  id: number;
  first_name: string;
  last_name: string;
  patronymic?: string;
  email: string;
  phone?: string;
  position?: string;
}

interface CompanyContext {
  user: any;
  refreshStats: () => void;
  stats: any;
}

const ProfilePage = () => {
  const { user, refreshStats } = useOutletContext<CompanyContext>();
  const [company, setCompany] = useState<Company | null>(null);
  const [responsiblePerson, setResponsiblePerson] = useState<ResponsiblePerson | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editForm, setEditForm] = useState<Partial<Company>>({});
  const [editPersonForm, setEditPersonForm] = useState<Partial<ResponsiblePerson>>({});
  const [newSocialLink, setNewSocialLink] = useState('');
  const [showSocialInput, setShowSocialInput] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCompanyProfile();
    fetchResponsiblePerson();
  }, []);

  const fetchCompanyProfile = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      let companyId: number | null = user?.company_id;

      if (!companyId) {
        const opportunitiesRes = await fetch('/api/opportunities/my', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (opportunitiesRes.ok) {
          const opportunities = await opportunitiesRes.json();
          if (opportunities.length > 0 && opportunities[0].company?.id) {
            companyId = opportunities[0].company.id;
          }
        }
      }

      if (!companyId) {
        try {
          const meRes = await fetch('/companies/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            companyId = meData.id;
          }
        } catch (e) {
          console.log('No /companies/me endpoint available');
        }
      }

      if (companyId) {
        const companyRes = await fetch(`/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (companyRes.ok) {
          const data = await companyRes.json();
          setCompany(data);
          setEditForm(data);
          setLogoPreview(data.logo_url || null);
          setCoverPreview(data.cover_url || null);
        }
      }
    } catch (error) {
      console.error('Error fetching company profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResponsiblePerson = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch('/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setResponsiblePerson({
          id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          patronymic: data.patronymic,
          email: data.email,
          phone: data.phone,
          position: data.position,
        });
        setEditPersonForm({
          first_name: data.first_name,
          last_name: data.last_name,
          patronymic: data.patronymic,
          phone: data.phone,
          position: data.position,
        });
      }
    } catch (error) {
      console.error('Error fetching responsible person:', error);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/uploads/image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.url;
      }
      return null;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!company) return;

    setSaving(true);
    setMessage(null);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      let logoUrl = editForm.logo_url;
      let coverUrl = editForm.cover_url;

      if (logoFile) {
        setUploadingLogo(true);
        const uploadedUrl = await uploadImage(logoFile);
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        } else {
          setMessage({ type: 'error', text: 'Не удалось загрузить логотип' });
          setSaving(false);
          setUploadingLogo(false);
          return;
        }
        setUploadingLogo(false);
      }

      if (coverFile) {
        setUploadingCover(true);
        const uploadedUrl = await uploadImage(coverFile);
        if (uploadedUrl) {
          coverUrl = uploadedUrl;
        } else {
          setMessage({ type: 'error', text: 'Не удалось загрузить обложку' });
          setSaving(false);
          setUploadingCover(false);
          return;
        }
        setUploadingCover(false);
      }

      // Обновляем данные компании
      const companyResponse = await fetch(`/companies/${company.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          brand_name: editForm.brand_name,
          description: editForm.description,
          industry: editForm.industry,
          phone: editForm.phone,
          website: editForm.website,
          city: editForm.city,
          actual_address: editForm.actual_address,
          employee_count: editForm.employee_count,
          founded_year: editForm.founded_year,
          social_links: editForm.social_links,
          logo_url: logoUrl,
          cover_url: coverUrl,
        }),
      });

      if (!companyResponse.ok) {
        const error = await companyResponse.json();
        throw new Error(error.detail || 'Ошибка при сохранении компании');
      }

      // Обновляем данные ответственного лица
      const personResponse = await fetch('/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: editPersonForm.first_name,
          last_name: editPersonForm.last_name,
          patronymic: editPersonForm.patronymic,
          phone: editPersonForm.phone,
        }),
      });

      if (!personResponse.ok) {
        const error = await personResponse.json();
        throw new Error(error.detail || 'Ошибка при сохранении данных ответственного лица');
      }

      const updatedCompany = await companyResponse.json();
      const updatedPerson = await personResponse.json();

      setCompany(updatedCompany);
      setEditForm(updatedCompany);
      setResponsiblePerson({
        id: updatedPerson.id,
        first_name: updatedPerson.first_name,
        last_name: updatedPerson.last_name,
        patronymic: updatedPerson.patronymic,
        email: updatedPerson.email,
        phone: updatedPerson.phone,
      });
      setLogoPreview(updatedCompany.logo_url || null);
      setCoverPreview(updatedCompany.cover_url || null);
      setLogoFile(null);
      setCoverFile(null);
      setIsEditing(false);
      refreshStats();
      setMessage({ type: 'success', text: 'Профиль компании и данные ответственного лица успешно обновлены' });
    } catch (error: any) {
      console.error('Error saving:', error);
      setMessage({ type: 'error', text: error.message || 'Ошибка сети' });
    } finally {
      setSaving(false);
      setUploadingLogo(false);
      setUploadingCover(false);
    }
  };

  const addSocialLink = () => {
    if (newSocialLink.trim()) {
      setEditForm({
        ...editForm,
        social_links: [...(editForm.social_links || []), newSocialLink.trim()],
      });
      setNewSocialLink('');
      setShowSocialInput(false);
    }
  };

  const removeSocialLink = (index: number) => {
    setEditForm({
      ...editForm,
      social_links: (editForm.social_links || []).filter((_, i) => i !== index),
    });
  };

  const getSocialIcon = (url: string) => {
    if (url.includes('linkedin')) return <Linkedin size={16} />;
    if (url.includes('instagram')) return <Instagram size={16} />;
    if (url.includes('facebook')) return <Facebook size={16} />;
    if (url.includes('twitter') || url.includes('x.com')) return <Twitter size={16} />;
    return <Globe size={16} />;
  };

  const getVerificationStatus = () => {
    if (!company) return null;
    switch (company.verification_status) {
      case 'verified':
        return { label: 'Верифицирована', icon: CheckCircle, color: '#33ff66' };
      case 'pending':
        return { label: 'На проверке', icon: AlertCircle, color: '#ffcc33' };
      case 'rejected':
        return { label: 'Отклонена', icon: XCircle, color: '#ff3366' };
      default:
        return { label: 'Не верифицирована', icon: AlertCircle, color: '#888' };
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="company-profile__loading">
        <div className="spinner"></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="company-profile__error">
        <AlertCircle size={48} />
        <h2>Профиль компании не найден</h2>
        <p>Пожалуйста, убедитесь, что вы зарегистрированы как компания.</p>
        <button
          className="company-profile__retry-btn"
          onClick={fetchCompanyProfile}
          style={{ marginTop: '16px', padding: '8px 24px', background: '#33ccff', border: 'none', borderRadius: '40px', color: '#000', cursor: 'pointer' }}
        >
          Повторить попытку
        </button>
      </div>
    );
  }

  const verificationStatus = getVerificationStatus();
  const StatusIcon = verificationStatus?.icon;

  return (
    <div className="company-profile">
      <motion.div
        className="company-profile__header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Профиль компании</h1>
        <p>Управление информацией о компании и ответственного лица</p>
      </motion.div>

      {message && (
        <motion.div
          className={`company-profile__message company-profile__message--${message.type}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {message.text}
        </motion.div>
      )}

      {/* Cover Image */}
      <div className="company-profile__cover">
        {coverPreview ? (
          <img src={coverPreview} alt="Cover" />
        ) : (
          <div className="company-profile__cover-placeholder">
            <Building2 size={48} />
          </div>
        )}
        {isEditing && (
          <label className="company-profile__cover-upload">
            {uploadingCover ? <Loader2 size={20} className="spinner" /> : <Upload size={20} />}
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              disabled={uploadingCover}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>

      <div className="company-profile__content">
        <div className="company-profile__avatar-section">
          <div className="company-profile__avatar">
            {logoPreview ? (
              <img src={logoPreview} alt={company.display_name || company.full_name} />
            ) : (
              <div className="company-profile__avatar-placeholder">
                {(company.display_name || company.full_name)?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            {isEditing && (
              <label className="company-profile__avatar-upload">
                {uploadingLogo ? <Loader2 size={16} className="spinner" /> : <Upload size={16} />}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  disabled={uploadingLogo}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>
          <div className="company-profile__info">
            <div className="company-profile__name-section">
              <h2>{company.display_name || company.full_name}</h2>
              <div className={`company-profile__verification-badge company-profile__verification-badge--${company.verification_status}`}>
                {StatusIcon && <StatusIcon size={14} />}
                <span>{verificationStatus?.label}</span>
              </div>
            </div>
            <p className="company-profile__inn">ИНН: {company.inn}</p>
            {company.ogrn && <p className="company-profile__ogrn">ОГРН: {company.ogrn}</p>}
            {company.is_email_verified && (
              <div className="company-profile__email-verified">
                <CheckCircle size={14} />
                <span>Корпоративная почта подтверждена</span>
              </div>
            )}
          </div>
        </div>

        <div className="company-profile__actions">
          {!isEditing ? (
            <button className="company-profile__edit-btn" onClick={() => setIsEditing(true)}>
              <Edit2 size={18} />
              <span>Редактировать профиль</span>
            </button>
          ) : (
            <div className="company-profile__edit-actions">
              <button className="company-profile__cancel-btn" onClick={() => {
                setIsEditing(false);
                setEditForm(company);
                setLogoPreview(company.logo_url || null);
                setCoverPreview(company.cover_url || null);
                setLogoFile(null);
                setCoverFile(null);
                setMessage(null);
              }}>
                <X size={18} />
                <span>Отмена</span>
              </button>
              <button className="company-profile__save-btn" onClick={handleSave} disabled={saving || uploadingLogo || uploadingCover}>
                {(saving || uploadingLogo || uploadingCover) ? <Loader2 size={18} className="spinner" /> : <Save size={18} />}
                <span>Сохранить</span>
              </button>
            </div>
          )}
        </div>

        <div className="company-profile__details">
          {/* Информация о компании */}
          <div className="company-profile__section">
            <h3>Основная информация</h3>
            <div className="company-profile__grid">
              <div className="company-profile__field">
                <label>Название компании</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.brand_name || editForm.full_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, brand_name: e.target.value })}
                    placeholder="Название компании"
                  />
                ) : (
                  <p>{company.brand_name || company.full_name}</p>
                )}
              </div>
              <div className="company-profile__field">
                <label>Сфера деятельности</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.industry || ''}
                    onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                    placeholder="Например, IT, Финансы, Образование"
                  />
                ) : (
                  <p>{company.industry || 'Не указано'}</p>
                )}
              </div>
              <div className="company-profile__field">
                <label>Город</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.city || ''}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="Город"
                  />
                ) : (
                  <p>{company.city || 'Не указан'}</p>
                )}
              </div>
              <div className="company-profile__field">
                <label>Количество сотрудников</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editForm.employee_count || ''}
                    onChange={(e) => setEditForm({ ...editForm, employee_count: parseInt(e.target.value) || undefined })}
                    placeholder="Количество сотрудников"
                  />
                ) : (
                  <p>{company.employee_count ? `${company.employee_count}+` : 'Не указано'}</p>
                )}
              </div>
              <div className="company-profile__field">
                <label>Год основания</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editForm.founded_year || ''}
                    onChange={(e) => setEditForm({ ...editForm, founded_year: parseInt(e.target.value) || undefined })}
                    placeholder="ГГГГ"
                  />
                ) : (
                  <p>{company.founded_year || 'Не указан'}</p>
                )}
              </div>
            </div>
          </div>

          <div className="company-profile__section">
            <h3>Описание компании</h3>
            {isEditing ? (
              <textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Расскажите о компании, её миссии и ценностях..."
                rows={6}
              />
            ) : (
              <p className="company-profile__description">{company.description || 'Описание отсутствует'}</p>
            )}
          </div>

          <div className="company-profile__section">
            <h3>Контактная информация компании</h3>
            <div className="company-profile__grid">
              <div className="company-profile__field">
                <label>Email компании</label>
                <div className="company-profile__field-icon">
                  <Mail size={16} />
                  <p>{company.email}</p>
                </div>
              </div>
              <div className="company-profile__field">
                <label>Телефон компании</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="+7 (XXX) XXX-XX-XX"
                  />
                ) : (
                  <div className="company-profile__field-icon">
                    <Phone size={16} />
                    <p>{company.phone || 'Не указан'}</p>
                  </div>
                )}
              </div>
              <div className="company-profile__field">
                <label>Сайт компании</label>
                {isEditing ? (
                  <input
                    type="url"
                    value={editForm.website || ''}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                ) : (
                  <div className="company-profile__field-icon">
                    <Globe size={16} />
                    {company.website ? (
                      <a href={company.website} target="_blank" rel="noopener noreferrer">{company.website}</a>
                    ) : (
                      <p>Не указан</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ответственное лицо */}
          <div className="company-profile__section">
            <div className="company-profile__section-header">
              <User size={20} />
              <h3>Ответственное лицо</h3>
            </div>
            <div className="company-profile__grid">
              <div className="company-profile__field">
                <label>Фамилия</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editPersonForm.last_name || ''}
                    onChange={(e) => setEditPersonForm({ ...editPersonForm, last_name: e.target.value })}
                    placeholder="Фамилия"
                  />
                ) : (
                  <p>{responsiblePerson?.last_name || '—'}</p>
                )}
              </div>
              <div className="company-profile__field">
                <label>Имя</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editPersonForm.first_name || ''}
                    onChange={(e) => setEditPersonForm({ ...editPersonForm, first_name: e.target.value })}
                    placeholder="Имя"
                  />
                ) : (
                  <p>{responsiblePerson?.first_name || '—'}</p>
                )}
              </div>
              <div className="company-profile__field">
                <label>Отчество</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editPersonForm.patronymic || ''}
                    onChange={(e) => setEditPersonForm({ ...editPersonForm, patronymic: e.target.value })}
                    placeholder="Отчество"
                  />
                ) : (
                  <p>{responsiblePerson?.patronymic || '—'}</p>
                )}
              </div>
              <div className="company-profile__field">
                <label>Email</label>
                <div className="company-profile__field-icon">
                  <Mail size={16} />
                  <p>{responsiblePerson?.email || '—'}</p>
                </div>
              </div>
              <div className="company-profile__field">
                <label>Телефон</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editPersonForm.phone || ''}
                    onChange={(e) => setEditPersonForm({ ...editPersonForm, phone: e.target.value })}
                    placeholder="+7 (XXX) XXX-XX-XX"
                  />
                ) : (
                  <div className="company-profile__field-icon">
                    <Phone size={16} />
                    <p>{responsiblePerson?.phone || '—'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Адреса */}
          <div className="company-profile__section">
            <h3>Адреса</h3>
            <div className="company-profile__grid">
              <div className="company-profile__field">
                <label>Юридический адрес</label>
                <div className="company-profile__field-icon">
                  <MapPin size={16} />
                  <p>{company.legal_address || 'Не указан'}</p>
                </div>
              </div>
              <div className="company-profile__field">
                <label>Фактический адрес</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.actual_address || ''}
                    onChange={(e) => setEditForm({ ...editForm, actual_address: e.target.value })}
                    placeholder="Фактический адрес"
                  />
                ) : (
                  <div className="company-profile__field-icon">
                    <MapPin size={16} />
                    <p>{company.actual_address || 'Не указан'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Социальные сети */}
          <div className="company-profile__section">
            <h3>Социальные сети</h3>
            <div className="company-profile__social-links">
              {(editForm.social_links || company.social_links || []).map((link, index) => (
                <div key={index} className="company-profile__social-link">
                  {getSocialIcon(link)}
                  {isEditing ? (
                    <>
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => {
                          const newLinks = [...(editForm.social_links || [])];
                          newLinks[index] = e.target.value;
                          setEditForm({ ...editForm, social_links: newLinks });
                        }}
                      />
                      <button onClick={() => removeSocialLink(index)} className="company-profile__social-remove">
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
                  )}
                </div>
              ))}
              {isEditing && showSocialInput ? (
                <div className="company-profile__social-add">
                  <input
                    type="url"
                    value={newSocialLink}
                    onChange={(e) => setNewSocialLink(e.target.value)}
                    placeholder="https://..."
                    onKeyPress={(e) => e.key === 'Enter' && addSocialLink()}
                  />
                  <button onClick={addSocialLink}>
                    <CheckCircle size={16} />
                  </button>
                  <button onClick={() => setShowSocialInput(false)}>
                    <X size={16} />
                  </button>
                </div>
              ) : isEditing ? (
                <button className="company-profile__add-social" onClick={() => setShowSocialInput(true)}>
                  <Plus size={16} />
                  <span>Добавить ссылку</span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="company-profile__section">
            <h3>Информация о регистрации</h3>
            <div className="company-profile__grid">
              <div className="company-profile__field">
                <label>Дата регистрации на платформе</label>
                <div className="company-profile__field-icon">
                  <Calendar size={16} />
                  <p>{formatDate(company.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;