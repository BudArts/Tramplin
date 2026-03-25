// frontend/src/pages/studentDashboard/ApplicationsPage.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Briefcase, CheckCircle, XCircle, Clock, Eye, User, MapPin, Calendar, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

interface Application {
  id: number;
  opportunity_id: number;
  status: 'pending' | 'viewed' | 'accepted' | 'rejected' | 'reserve';
  cover_letter?: string;
  created_at: string;
  opportunity: {
    id: number;
    title: string;
    city: string;
    company_name?: string;
    company_logo?: string;
    salary_min?: number;
    salary_max?: number;
  };
}

const ApplicationsPage = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      let url = `/api/applications/my?per_page=50`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setApplications(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const withdrawApplication = async (applicationId: number) => {
    setWithdrawingId(applicationId);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/applications/${applicationId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) setApplications(prev => prev.filter(app => app.id !== applicationId));
    } catch (error) {
      console.error('Error withdrawing application:', error);
    } finally {
      setWithdrawingId(null);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'На рассмотрении', icon: Clock, color: '#ffcc33' };
      case 'viewed': return { label: 'Просмотрено', icon: Eye, color: '#33ccff' };
      case 'accepted': return { label: 'Принято', icon: CheckCircle, color: '#33ff66' };
      case 'rejected': return { label: 'Отклонено', icon: XCircle, color: '#ff3366' };
      case 'reserve': return { label: 'В резерве', icon: User, color: '#cc33ff' };
      default: return { label: status, icon: Clock, color: '#888' };
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null;
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()} ₽`;
    if (min) return `от ${min.toLocaleString()} ₽`;
    if (max) return `до ${max.toLocaleString()} ₽`;
    return null;
  };

  const statusOptions = [
    { value: null, label: 'Все' },
    { value: 'pending', label: 'На рассмотрении' },
    { value: 'viewed', label: 'Просмотрено' },
    { value: 'accepted', label: 'Принято' },
    { value: 'rejected', label: 'Отклонено' },
    { value: 'reserve', label: 'В резерве' },
  ];

  if (loading) {
    return (
      <div className="student-applications__loading">
        <div className="spinner"></div>
        <p>Загрузка откликов...</p>
      </div>
    );
  }

  return (
    <div className="student-applications">
      <motion.div className="student-applications__header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1>Мои отклики</h1>
        <p>История и статусы ваших откликов на вакансии и стажировки</p>
      </motion.div>

      <div className="student-applications__filters">
        <div className="student-applications__status-filter">
          {statusOptions.map(option => (
            <button key={option.value || 'all'} className={`student-applications__filter-btn ${statusFilter === option.value ? 'active' : ''}`} onClick={() => setStatusFilter(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
        <div className="student-applications__count">{applications.length} отклик{applications.length !== 1 ? 'ов' : ''}</div>
      </div>

      <AnimatePresence>
        {applications.length === 0 ? (
          <motion.div className="student-applications__empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="student-applications__empty-icon"><Briefcase size={48} /></div>
            <h3>Нет откликов</h3>
            <p>{statusFilter ? `У вас нет откликов со статусом "${statusOptions.find(o => o.value === statusFilter)?.label}"` : 'Вы еще не откликались на вакансии и стажировки'}</p>
            <button className="student-applications__empty-btn" onClick={() => navigate('/')}>Найти возможности</button>
          </motion.div>
        ) : (
          <div className="student-applications__list">
            {applications.map((app, index) => {
              const statusConfig = getStatusConfig(app.status);
              const StatusIcon = statusConfig.icon;
              const salary = formatSalary(app.opportunity.salary_min, app.opportunity.salary_max);

              return (
                <motion.div key={app.id} className="student-applications__card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <div className="student-applications__card-main">
                    <div className="student-applications__card-info">
                      <div className="student-applications__card-header">
                        <h3 className="student-applications__card-title" onClick={() => navigate(`/opportunities/${app.opportunity_id}`)}>{app.opportunity.title}</h3>
                        <div className="student-applications__card-status" style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}>
                          <StatusIcon size={14} /><span>{statusConfig.label}</span>
                        </div>
                      </div>
                      <div className="student-applications__card-company">
                        {app.opportunity.company_logo ? <img src={app.opportunity.company_logo} alt={app.opportunity.company_name} /> : <div className="student-applications__card-company-placeholder">{app.opportunity.company_name?.[0] || '?'}</div>}
                        <span>{app.opportunity.company_name}</span>
                      </div>
                      <div className="student-applications__card-meta">
                        <div className="student-applications__card-meta-item"><MapPin size={14} /><span>{app.opportunity.city}</span></div>
                        {salary && <div className="student-applications__card-meta-item student-applications__card-salary">{salary}</div>}
                        <div className="student-applications__card-meta-item"><Calendar size={14} /><span>{formatDate(app.created_at)}</span></div>
                      </div>
                      {app.cover_letter && (
                        <button className="student-applications__toggle-cover" onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}>
                          {expandedId === app.id ? <><ChevronUp size={16} /><span>Скрыть сопроводительное</span></> : <><ChevronDown size={16} /><span>Показать сопроводительное</span></>}
                        </button>
                      )}
                    </div>
                    {app.status === 'pending' && (
                      <button className="student-applications__withdraw-btn" onClick={() => withdrawApplication(app.id)} disabled={withdrawingId === app.id}>
                        {withdrawingId === app.id ? <div className="spinner-small"></div> : <><Trash2 size={16} /><span>Отозвать</span></>}
                      </button>
                    )}
                  </div>
                  {expandedId === app.id && app.cover_letter && (
                    <motion.div className="student-applications__cover-letter" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <p>{app.cover_letter}</p>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ApplicationsPage;