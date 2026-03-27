// frontend/src/pages/curatorDashboard/TagsPage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import {
  Tag,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  X,
  Loader2,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

interface Tag {
  id: number;
  name: string;
  category: 'technology' | 'level' | 'employment_type' | 'domain' | 'custom';
  is_approved: boolean;
  usage_count: number;
  proposed_by?: number;
  created_at: string;
}

interface CuratorContext {
  user: any;
  refreshStats: () => void;
  stats: any;
}

const TagsPage = () => {
  const { refreshStats } = useOutletContext<CuratorContext>();
  const [pendingTags, setPendingTags] = useState<Tag[]>([]);
  const [approvedTags, setApprovedTags] = useState<Tag[]>([]);
  const [filteredPending, setFilteredPending] = useState<Tag[]>([]);
  const [filteredApproved, setFilteredApproved] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    filterTags();
  }, [pendingTags, approvedTags, searchQuery]);

  const fetchTags = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setLoading(true);
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        fetch('/api/curator/tags/pending', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/tags?approved_only=true', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingTags(data);
      }
      if (approvedRes.ok) {
        const data = await approvedRes.json();
        setApprovedTags(data);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTags = () => {
    if (searchQuery) {
      setFilteredPending(
        pendingTags.filter(tag =>
          tag.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
      setFilteredApproved(
        approvedTags.filter(tag =>
          tag.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredPending(pendingTags);
      setFilteredApproved(approvedTags);
    }
  };

  const approveTag = async (tagId: number) => {
    setActionLoading(tagId);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/curator/tags/${tagId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchTags();
        refreshStats();
        alert('Тег одобрен');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при одобрении тега');
      }
    } catch (error) {
      console.error('Error approving tag:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectTag = async (tagId: number, reason?: string) => {
    setActionLoading(tagId);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`/api/curator/tags/${tagId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        await fetchTags();
        refreshStats();
        setShowRejectModal(false);
        alert('Тег отклонен');
      } else {
        const error = await response.json();
        alert(error.detail || 'Ошибка при отклонении тега');
      }
    } catch (error) {
      console.error('Error rejecting tag:', error);
      alert('Ошибка сети');
    } finally {
      setActionLoading(null);
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'technology': return 'Технологии';
      case 'level': return 'Уровень';
      case 'employment_type': return 'Тип занятости';
      case 'domain': return 'Домен';
      case 'custom': return 'Пользовательский';
      default: return category;
    }
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
      <div className="curator-tags__loading">
        <div className="spinner"></div>
        <p>Загрузка тегов...</p>
      </div>
    );
  }

  return (
    <div className="curator-tags">
      <motion.div
        className="curator-tags__header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Управление тегами</h1>
        <p>Модерация предложенных тегов и управление существующими</p>
      </motion.div>

      <div className="curator-tags__toolbar">
        <div className="curator-tags__search">
          <Search size={20} />
          <input
            type="text"
            placeholder="Поиск тегов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="curator-tags__tabs">
        <button
          className={`curator-tags__tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          На модерации
          {pendingTags.length > 0 && (
            <span className="curator-tags__tab-count">{pendingTags.length}</span>
          )}
        </button>
        <button
          className={`curator-tags__tab ${activeTab === 'approved' ? 'active' : ''}`}
          onClick={() => setActiveTab('approved')}
        >
          Все теги
          <span className="curator-tags__tab-count">{approvedTags.length}</span>
        </button>
      </div>

      {activeTab === 'pending' && (
        <div className="curator-tags__list">
          {filteredPending.length === 0 ? (
            <div className="curator-tags__empty">
              <div className="curator-tags__empty-icon"><Tag size={48} /></div>
              <h3>Нет тегов на модерации</h3>
              <p>Все предложенные теги уже обработаны</p>
            </div>
          ) : (
            filteredPending.map((tag, index) => (
              <motion.div
                key={tag.id}
                className="curator-tags__card curator-tags__card--pending"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="curator-tags__card-content">
                  <div className="curator-tags__card-name">{tag.name}</div>
                  <div className="curator-tags__card-category">{getCategoryLabel(tag.category)}</div>
                  <div className="curator-tags__card-date">Предложен: {formatDate(tag.created_at)}</div>
                </div>
                <div className="curator-tags__card-actions">
                  <button
                    className="curator-tags__action-btn curator-tags__action-btn--approve"
                    onClick={() => approveTag(tag.id)}
                    disabled={actionLoading === tag.id}
                  >
                    {actionLoading === tag.id ? <Loader2 size={16} className="spinner" /> : <CheckCircle size={16} />}
                    <span>Одобрить</span>
                  </button>
                  <button
                    className="curator-tags__action-btn curator-tags__action-btn--reject"
                    onClick={() => {
                      setSelectedTag(tag);
                      setShowRejectModal(true);
                    }}
                    disabled={actionLoading === tag.id}
                  >
                    <XCircle size={16} />
                    <span>Отклонить</span>
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === 'approved' && (
        <div className="curator-tags__list">
          {filteredApproved.length === 0 ? (
            <div className="curator-tags__empty">
              <div className="curator-tags__empty-icon"><Tag size={48} /></div>
              <h3>Теги не найдены</h3>
              <p>Попробуйте изменить поисковый запрос</p>
            </div>
          ) : (
            filteredApproved.map((tag, index) => (
              <motion.div
                key={tag.id}
                className="curator-tags__card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <div className="curator-tags__card-content">
                  <div className="curator-tags__card-name">{tag.name}</div>
                  <div className="curator-tags__card-category">{getCategoryLabel(tag.category)}</div>
                  <div className="curator-tags__card-usage">
                    Использований: {tag.usage_count}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedTag && (
          <motion.div
            className="curator-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              className="curator-modal__content curator-modal__content--small"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <h3>Причина отклонения</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Укажите причину отклонения тега..."
                rows={4}
              />
              <div className="curator-modal__actions">
                <button
                  className="curator-modal__action-btn curator-modal__action-btn--cancel"
                  onClick={() => setShowRejectModal(false)}
                >
                  Отмена
                </button>
                <button
                  className="curator-modal__action-btn curator-modal__action-btn--reject"
                  onClick={() => rejectTag(selectedTag.id, rejectReason)}
                  disabled={actionLoading === selectedTag.id}
                >
                  {actionLoading === selectedTag.id ? <Loader2 size={18} className="spinner" /> : 'Отклонить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TagsPage;