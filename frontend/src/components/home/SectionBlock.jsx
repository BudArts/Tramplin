import React from 'react';
import { motion } from 'framer-motion';
import './SectionBlock.css';

function SectionBlock({ id, title, subtitle, icon, color, data = [], isLoading, onAuthRequired, onTagClick }) {
  return (
    <section className="section-block" id={id}>
      <div className="container">
        <motion.div 
          className="section-block__header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="section-block__icon-box" style={{ background: `${color}15`, color: color, borderColor: `${color}30` }}>
            {icon}
          </div>
          <h2 style={{ color: color }}>{title}</h2>
          <p>{subtitle}</p>
        </motion.div>

        <div className="section-block__grid">
          {isLoading ? (
            <div className="loading-state">Загружаем данные...</div>
          ) : data && data.length > 0 ? (
            data.map((item, index) => (
              <motion.div 
                key={item.id || item.inn || index} 
                className="card-v2"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="card-v2__top-line" style={{ background: color }} />
                <div className="card-v2__body">
                  <div className="card-v2__company">{item.company_name || "Работодатель"}</div>
                  <h3 className="card-v2__title">{item.name || item.title}</h3>
                  <p className="card-v2__desc">{item.short_description}</p>
                  
                  {item.tags && (
                    <div className="card-v2__tags">
                      {item.tags.map(tag => (
                        <span key={tag} className="card-v2__tag" onClick={() => onTagClick && onTagClick(tag)}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <button className="card-v2__btn" onClick={onAuthRequired} style={{ color: color, borderColor: color }}>
                    ОТКЛИКНУТЬСЯ
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="empty-state">Нет актуальных предложений</div>
          )}
        </div>
      </div>
    </section>
  );
}

export default SectionBlock;