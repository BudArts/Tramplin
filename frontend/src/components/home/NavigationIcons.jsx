import React from 'react'
import { motion } from 'framer-motion'
import {
  FiMap, FiAward, FiCalendar, FiTrendingUp, FiStar, FiSearch
} from 'react-icons/fi'
import './NavigationIcons.css'

const ICONS = {
  map: FiMap,
  internships: FiAward,
  events: FiCalendar,
  vacancies: FiTrendingUp,
  rating: FiStar,
  tags: FiSearch,
}

const SHORT_LABELS = {
  map: ['КАРТА', 'ВОЗМОЖНОСТЕЙ'],
  internships: ['СТАЖИРОВКИ'],
  events: ['МЕРОПРИЯТИЯ'],
  vacancies: ['ВАКАНСИИ'],
  rating: ['РЕЙТИНГ'],
  tags: ['ПОИСК'],
}

function NavigationIcons({ sections, activeSection, onSectionClick }) {
  if (!sections || sections.length === 0) return null;

  return (
    <motion.nav
      className="nav-icons"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="nav-icons__track">
        {sections.map((s, i) => {
          const Icon = ICONS[s.id]
          const active = activeSection === s.id
          const lines = SHORT_LABELS[s.id] || [s.title]

          return (
            <motion.button
              key={s.id}
              className={`nav-icons__item ${active ? 'nav-icons__item--active' : ''}`}
              onClick={() => onSectionClick(s.id)}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.96 }}
            >
              <div className="nav-icons__icon-box">
                {Icon && <Icon className="nav-icons__icon" />}
                {active && <div className="nav-icons__glow" />}
              </div>
              <span className="nav-icons__label">
                {lines.map((line, li) => (
                  <React.Fragment key={li}>
                    {li > 0 && <br />}
                    {line}
                  </React.Fragment>
                ))}
              </span>
            </motion.button>
          )
        })}
      </div>
    </motion.nav>
  )
}

export default NavigationIcons