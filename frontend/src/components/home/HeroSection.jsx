import React from 'react'
import { motion } from 'framer-motion'
import HeroCarousel from './HeroCarousel'
import { FiArrowRight, FiChevronDown } from 'react-icons/fi'
import './HeroSection.css'

function HeroSection({ onScrollDown, scrollToSection }) {
  return (
    <section className="hero">
      <div className="hero__aurora">
        <div className="hero__aurora-blob hero__aurora-blob--1" />
        <div className="hero__aurora-blob hero__aurora-blob--2" />
        <div className="hero__aurora-blob hero__aurora-blob--3" />
        <div className="hero__aurora-blob hero__aurora-blob--4" />
      </div>

      <div className="hero__grid-pattern" />

      <div className="hero__content container">
        <motion.div
          className="hero__left"
          initial={{ opacity: 0, x: -80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="hero__badge">
            <span className="hero__badge-dot" />
            <span>Платформа для IT-карьеры</span>
          </div>

          <h1 className="hero__title">
            <span className="hero__title-line">ТВОЙ СТАРТ ДЛЯ</span>
            <span className="hero__title-line">УСПЕШНОЙ</span>
            <span className="hero__title-accent">КАРЬЕРЫ</span>
          </h1>

          <p className="hero__subtitle">
            Находи стажировки, участвуй в мероприятиях, строй карьеру с ведущими IT-компаниями
          </p>

          <div className="hero__actions">
            <button className="hero__action-btn hero__action-btn--primary" onClick={onScrollDown}>
              <span>УЗНАТЬ БОЛЬШЕ</span>
              <FiArrowRight />
            </button>
            <button className="hero__action-btn hero__action-btn--outline">
              <span>СМОТРЕТЬ ВАКАНСИИ</span>
            </button>
          </div>

          <div className="hero__stats">
            <div className="hero__stat">
              <span className="hero__stat-value">1000+</span>
              <span className="hero__stat-label">вакансий</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-value">500+</span>
              <span className="hero__stat-label">компаний</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-value">50K+</span>
              <span className="hero__stat-label">студентов</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="hero__right"
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <HeroCarousel onNavigate={scrollToSection} />
        </motion.div>
      </div>

      <motion.button
        className="hero__scroll-down"
        onClick={onScrollDown}
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        aria-label="Прокрутить вниз"
      >
        <FiChevronDown />
      </motion.button>

      <div className="hero__fade-bottom" />
    </section>
  )
}

export default HeroSection