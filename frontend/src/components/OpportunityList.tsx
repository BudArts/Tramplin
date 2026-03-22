import { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import type { OpportunityResponse, OpportunityType } from '../api/types';
import OpportunityCard from './OpportunityCard';
import type { Filters } from '../pages/LandingPage';

/* ────────────────────────────────────────────
   Типы и константы
   ──────────────────────────────────────────── */
const CATEGORIES: { value: OpportunityType; label: string; emoji: string }[] = [
  { value: 'internship', label: 'Стажировки', emoji: '🎓' },
  { value: 'vacancy',    label: 'Вакансии',   emoji: '💼' },
  { value: 'mentorship', label: 'Менторство',  emoji: '🧭' },
  { value: 'event',      label: 'Мероприятия', emoji: '🎪' },
];

const PER_CATEGORY = 3; // По 3 карточки на категорию, всего 12 карточек

interface Props {
  filters: Filters;
  onFilterChange: (partial: Partial<Filters>) => void;
  favorites: {
    isOpportunityFav: (id: number) => boolean;
    toggleOpportunity: (id: number) => void;
  };
  onShowMore?: () => void;
  isMainPage?: boolean;
  onDataUpdate?: (opportunities: OpportunityResponse[]) => void;
}

export interface OpportunityListRef {
  getDisplayedOpportunities: () => OpportunityResponse[];
}

/* ────────────────────────────────────────────
   Компонент
   ──────────────────────────────────────────── */
const OpportunityList = forwardRef<OpportunityListRef, Props>(({
  filters,
  onFilterChange,
  favorites,
  onShowMore,
  isMainPage = false,
  onDataUpdate,
}, ref) => {
  // Данные по каждой категории
  const [dataByCategory, setDataByCategory] = useState<
    Record<OpportunityType, OpportunityResponse[]>
  >({
    internship: [],
    vacancy: [],
    mentorship: [],
    event: [],
  });

  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(filters.search);

  // Текущий выбранный фильтр категории (null = все вперемешку)
  const activeCategory = filters.type || null;

  /* ── Debounce поиска ── */
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ search: searchInput });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, onFilterChange]);

  /* ── Загрузка: по 3 штуки на каждую категорию (всего 12 карточек) ── */
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      const params: Record<string, any> = {
        sort: 'published_at',
        order: 'desc',
        per_page: PER_CATEGORY,
      };

      if (filters.search) params.search = filters.search;
      if (filters.workFormat) params.work_format = filters.workFormat;
      if (filters.city) params.city = filters.city;
      if (filters.salaryMin) params.salary_min = filters.salaryMin;
      if (filters.salaryMax) params.salary_max = filters.salaryMax;

      // Параллельно запрашиваем все 4 категории
      const results = await Promise.all(
        CATEGORIES.map(cat =>
          api.opportunities
            .list({ ...params, type: cat.value })
            .then(res => ({
              type: cat.value,
              items: res.data?.items ?? [],
            }))
            .catch(() => ({
              type: cat.value,
              items: [] as OpportunityResponse[],
            }))
        )
      );

      const newData: Record<OpportunityType, OpportunityResponse[]> = {
        internship: [],
        vacancy: [],
        mentorship: [],
        event: [],
      };

      results.forEach(r => {
        newData[r.type] = r.items;
      });

      setDataByCategory(newData);
      setLoading(false);
    };

    fetchAll();
  }, [
    filters.search,
    filters.workFormat,
    filters.city,
    filters.salaryMin,
    filters.salaryMax,
  ]);

  /* ── Собираем итоговый список ТОЛЬКО для отображения (те самые 12-48 карточек) ── */
  const displayedOpportunities = useMemo(() => {
    if (activeCategory) {
      // Показать только выбранную категорию (до 3 карточек)
      return [...dataByCategory[activeCategory]].sort(
        (a, b) =>
          new Date(b.published_at ?? b.created_at).getTime() -
          new Date(a.published_at ?? a.created_at).getTime()
      );
    }

    // Все категории вперемешку (всего до 12 карточек: 4 категории × 3 карточки)
    const all = Object.values(dataByCategory).flat();
    return all.sort(
      (a, b) =>
        new Date(b.published_at ?? b.created_at).getTime() -
        new Date(a.published_at ?? a.created_at).getTime()
    );
  }, [dataByCategory, activeCategory]);

  // Передаём на карту ТОЛЬКО отображаемые карточки
  useEffect(() => {
    if (onDataUpdate) {
      onDataUpdate(displayedOpportunities);
    }
  }, [displayedOpportunities, onDataUpdate]);

  // Экспортируем метод для получения отображаемых возможностей
  useImperativeHandle(ref, () => ({
    getDisplayedOpportunities: () => displayedOpportunities,
  }));

  /* ── Подсчёт по категориям (для бейджей) ── */
  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    CATEGORIES.forEach(cat => {
      counts[cat.value] = dataByCategory[cat.value].length;
    });
    counts['all'] = Object.values(dataByCategory).flat().length;
    return counts;
  }, [dataByCategory]);

  /* ── Сброс ── */
  const resetFilters = useCallback(() => {
    onFilterChange({
      search: '',
      type: undefined,
      workFormat: undefined,
      city: '',
      salaryMin: undefined,
      salaryMax: undefined,
    });
    setSearchInput('');
  }, [onFilterChange]);

  const hasActiveFilters =
    filters.search ||
    filters.type ||
    filters.workFormat ||
    filters.city ||
    filters.salaryMin ||
    filters.salaryMax;

  /* ── Выбор категории (toggle) ── */
  const handleCategoryClick = (type: OpportunityType) => {
    if (filters.type === type) {
      onFilterChange({ type: undefined }); // снять фильтр
    } else {
      onFilterChange({ type });
    }
  };

  /* ────────────────────────────────────────────
     РЕНДЕР
     ──────────────────────────────────────────── */
  return (
    <section className="opportunity-section" id="opportunities-section">

      {/* ═══ Панель фильтров ═══ */}
      <div className="filter-bar">
        <div className="filter-bar__inner">

          {/* Поиск */}
          <div className="filter-bar__search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Поиск по названию, компании, навыку..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                className="filter-bar__search-clear"
                onClick={() => setSearchInput('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Категории-табы */}
          <div className="filter-bar__categories">
            <button
              className={`filter-bar__cat-btn ${
                !activeCategory ? 'filter-bar__cat-btn--active' : ''
              }`}
              onClick={() => onFilterChange({ type: undefined })}
            >
              Все
              <span className="filter-bar__cat-count">
                {countByCategory['all']}
              </span>
            </button>

            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                className={`filter-bar__cat-btn filter-bar__cat-btn--${cat.value} ${
                  activeCategory === cat.value
                    ? 'filter-bar__cat-btn--active'
                    : ''
                }`}
                onClick={() => handleCategoryClick(cat.value)}
              >
                <span className="filter-bar__cat-emoji">{cat.emoji}</span>
                {cat.label}
                <span className="filter-bar__cat-count">
                  {countByCategory[cat.value]}
                </span>
              </button>
            ))}
          </div>

          {/* Кнопка сброса */}
          {hasActiveFilters && (
            <button className="filter-bar__btn-reset" onClick={resetFilters}>
              <X size={14} />
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* ═══ Заголовок ═══ */}
      <motion.div
        className="opportunity-section__header"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="opportunity-section__title">
          {activeCategory
            ? CATEGORIES.find(c => c.value === activeCategory)?.label ??
              'Возможности'
            : 'Последние возможности'}
        </h2>
        <div className="opportunity-section__count">
          Показано <span>{displayedOpportunities.length}</span> из{' '}
          <span>{countByCategory['all']}</span> возможностей
        </div>
      </motion.div>

      {/* ═══ Контент ═══ */}
      {loading ? (
        <div className="opportunity-grid">
          {Array.from({ length: PER_CATEGORY * CATEGORIES.length }).map(
            (_, i) => (
              <div key={i} className="loading-card" />
            )
          )}
        </div>
      ) : displayedOpportunities.length > 0 ? (
        <>
          <div className="opportunity-grid">
            <AnimatePresence mode="popLayout">
              {displayedOpportunities.map((opp, i) => (
                <motion.div
                  key={opp.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                >
                  <OpportunityCard opportunity={opp} index={i} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Кнопка "Показать все" на главной */}
          {isMainPage && onShowMore && (
            <div className="show-more-wrapper">
              <motion.button
                className="btn-show-more"
                onClick={onShowMore}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                whileTap={{ scale: 0.97 }}
              >
                ПОКАЗАТЬ ВСЕ ВОЗМОЖНОСТИ
                <ArrowRight size={20} />
              </motion.button>
            </div>
          )}
        </>
      ) : (
        <div className="opportunity-section__empty">
          <div className="opportunity-section__empty-icon">🔍</div>
          <p className="opportunity-section__empty-text">
            Возможности не найдены
          </p>
          <p className="opportunity-section__empty-sub">
            Попробуйте изменить параметры поиска или сбросить фильтры
          </p>
          {hasActiveFilters && (
            <button
              className="opportunity-section__empty-reset"
              onClick={resetFilters}
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      )}
    </section>
  );
});

OpportunityList.displayName = 'OpportunityList';

export default OpportunityList;