import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

const slides = [
  '/carousel-1.png',
  '/carousel-2.png',
  '/carousel-3.png',
];

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

const HeroSection = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  const goTo = useCallback((index: number) => {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  }, [current]);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent(prev => (prev + 1) % slides.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent(prev => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const handleImageError = (index: number) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
  };

  return (
    <section className="hero">
      <div className="hero__container container">
        <motion.div
          className="hero__content"
          initial={{ opacity: 0, x: -80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <p className="hero__subtitle">ПЛАТФОРМА ДЛЯ НАЧИНАЮЩИХ IT-СПЕЦИАЛИСТОВ</p>
          <h1 className="hero__title">
            ТВОЙ СТАРТ ДЛЯ
            <br />
            УСПЕШНОЙ
            <h2 className="hero__title">
              <span className="hero__title-accent">КАРЬЕРЫ</span>
            </h2>
          </h1>

          

          <div className="hero__tags">
            <span className="hero__tag">СТАЖИРОВКИ</span>
            <span className="hero__tag">ВАКАНСИИ</span>
            <span className="hero__tag">МЕНТОРСТВО</span>
          </div>

          <button
            className="hero__btn-more"
            onClick={() => document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            УЗНАТЬ БОЛЬШЕ
            <ArrowRight size={20} />
          </button>
        </motion.div>

        <motion.div
          className="hero__carousel-wrapper"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          <div className="hero__carousel">
            <div className="hero__carousel-viewport">
              <AnimatePresence custom={direction} mode="wait">
                {!imageErrors[current] ? (
                  <motion.img
                    key={current}
                    src={slides[current]}
                    alt={`Слайд ${current + 1}`}
                    className="hero__carousel-image"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.45 }}
                    draggable={false}
                    onError={() => handleImageError(current)}
                  />
                ) : (
                  <motion.div
                    key={current}
                    className="hero__carousel-fallback"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.45 }}
                  >
                    <div className="hero__carousel-fallback-content">
                      <span className="hero__carousel-fallback-emoji">🎯</span>
                      <h3>Твой старт к успешной карьере</h3>
                      <p>Стажировки • Вакансии • Менторство</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button className="hero__carousel-nav hero__carousel-nav--prev" onClick={prev} aria-label="Предыдущий слайд">
              <ChevronLeft size={22} />
            </button>
            <button className="hero__carousel-nav hero__carousel-nav--next" onClick={next} aria-label="Следующий слайд">
              <ChevronRight size={22} />
            </button>

            <div className="hero__carousel-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  className={`hero__carousel-dot ${i === current ? 'hero__carousel-dot--active' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`Перейти к слайду ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;