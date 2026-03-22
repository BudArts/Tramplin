import { motion } from 'framer-motion';
import { Map, GraduationCap, Calendar, Briefcase, BarChart3, Layers } from 'lucide-react';
import type { OpportunityType } from '../api/types';

/* ────────────────────────────────────────────
   Конфигурация категорий
   ──────────────────────────────────────────── */
interface CategoryConfig {
  id: string;
  label: string;
  icon: React.FC<{ size?: number }>;
  /** Если задан — применяется как фильтр type; null = "все" */
  filterType: OpportunityType | null;
  /** Куда скроллить при клике */
  scrollTo: string;
}

const categories: CategoryConfig[] = [
  {
    id: 'map',
    label: 'КАРТА',
    icon: Map,
    filterType: null,
    scrollTo: '#map-section',
  },
  {
    id: 'all',
    label: 'ВСЕ',
    icon: Layers,
    filterType: null,
    scrollTo: '#opportunities-section',
  },
  {
    id: 'internship',
    label: 'СТАЖИРОВКИ',
    icon: GraduationCap,
    filterType: 'internship',
    scrollTo: '#opportunities-section',
  },
  {
    id: 'event',
    label: 'МЕРОПРИЯТИЯ',
    icon: Calendar,
    filterType: 'event',
    scrollTo: '#opportunities-section',
  },
  {
    id: 'vacancy',
    label: 'ВАКАНСИИ',
    icon: Briefcase,
    filterType: 'vacancy',
    scrollTo: '#opportunities-section',
  },
  {
    id: 'companies',
    label: 'РЕЙТИНГ',
    icon: BarChart3,
    filterType: null,
    scrollTo: '#companies-section',
  },
];

/* ────────────────────────────────────────────
   Props
   ──────────────────────────────────────────── */
interface Props {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  /** Колбэк для применения фильтра типа возможности */
  onFilterByType?: (type: OpportunityType | undefined) => void;
}

/* ────────────────────────────────────────────
   Компонент
   ──────────────────────────────────────────── */
const CategoryNav: React.FC<Props> = ({
  activeCategory,
  onCategoryChange,
  onFilterByType,
}) => {

  const handleClick = (cat: CategoryConfig) => {
    // 1. Обновить активную категорию в навбаре
    onCategoryChange(cat.id);

    // 2. Применить фильтр (если это категория возможностей)
    if (onFilterByType && cat.scrollTo === '#opportunities-section') {
      onFilterByType(cat.filterType ?? undefined);
    }

    // 3. Плавный скролл к нужной секции
    const targetElement = document.querySelector(cat.scrollTo);
    if (targetElement) {
      const headerHeight = parseInt(
        getComputedStyle(document.documentElement)
          .getPropertyValue('--header-height') || '72'
      );
      // Высота самого category-nav
      const navHeight = document.querySelector('.category-nav')?.getBoundingClientRect().height ?? 60;

      const elementPosition = targetElement.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - headerHeight - navHeight - 16;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <motion.nav
      className="category-nav"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="category-nav__inner">
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;

          return (
            <motion.div
              key={cat.id}
              className={`category-nav__item ${
                isActive ? 'category-nav__item--active' : ''
              }`}
              onClick={() => handleClick(cat)}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="category-nav__icon">
                <Icon size={20} />
              </div>
              <span className="category-nav__label">{cat.label}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default CategoryNav;