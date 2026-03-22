import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import './HeroCarousel.css'

const slides = [
  {
    id: 1,
    image: '/images/slide-1.png',
    buttonText: 'МЕРОПРИЯТИЯ',
    section: 'events',
  },
  {
    id: 2,
    image: '/images/slide-2.png',
    buttonText: 'ВАКАНСИИ',
    section: 'vacancies',
  },
  {
    id: 3,
    image: '/images/slide-3.png',
    buttonText: 'СТАЖИРОВКИ',
    section: 'internships',
  },
]

const slideVariants = {
  enter: (dir) => ({
    x: dir > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir) => ({
    x: dir > 0 ? -300 : 300,
    opacity: 0,
  }),
}

function HeroCarousel({ onNavigate }) {
  const [[idx, dir], setSlide] = useState([0, 0])
  const [autoPlay, setAutoPlay] = useState(true)
  const [progressKey, setProgressKey] = useState(0)

  const paginate = useCallback((d) => {
    setSlide(([prev]) => [(prev + d + slides.length) % slides.length, d])
    setProgressKey((k) => k + 1)
  }, [])

  const goTo = useCallback((i) => {
    setSlide(([prev]) => [i, i > prev ? 1 : -1])
    setProgressKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (!autoPlay) return
    const timer = setInterval(() => paginate(1), 5000)
    return () => clearInterval(timer)
  }, [autoPlay, paginate, idx]) // Добавлен idx для синхронизации таймера

  const slide = slides[idx]

  return (
    <div
      className="carousel"
      onMouseEnter={() => setAutoPlay(false)}
      onMouseLeave={() => setAutoPlay(true)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="carousel__glow" />

      <button
        className="carousel__arrow carousel__arrow--left"
        onClick={() => paginate(-1)}
        aria-label="Предыдущий"
      >
        <FiChevronLeft />
      </button>

      <div className="carousel__viewport">
        <AnimatePresence initial={false} custom={dir} mode="wait">
          <motion.div
            key={slide.id}
            className="carousel__slide"
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          >
            <div
              className="carousel__image"
              style={{ backgroundImage: `url(${slide.image})` }}
              role="img"
            />

            <button
              className="carousel__section-btn"
              onClick={() => onNavigate && onNavigate(slide.section)}
            >
              {slide.buttonText}
            </button>
          </motion.div>
        </AnimatePresence>

        <div className="carousel__progress">
          <motion.div
            key={progressKey}
            className="carousel__progress-bar"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 5, ease: 'linear' }}
          />
        </div>
      </div>

      <button
        className="carousel__arrow carousel__arrow--right"
        onClick={() => paginate(1)}
        aria-label="Следующий"
      >
        <FiChevronRight />
      </button>

      <div className="carousel__dots">
        {slides.map((s, i) => (
          <button
            key={s.id}
            className={`carousel__dot ${i === idx ? 'carousel__dot--active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Слайд ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export default HeroCarousel