import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';


const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      className={`header ${scrolled ? 'header--scrolled' : ''}`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="header__inner">
        <Link to="/" className="header__logo">
          {/* Замените на ваш логотип */}
          <img src="/logo.png" alt="Трамплин" onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.innerHTML =
              '<span class="header__logo-text">Трамплин</span>';
          }} />
        </Link>

        <nav className="header__nav">
          <a href="#employers" className="header__link">Работодателям</a>
          <a href="#students" className="header__link header__link--accent">Студентам</a>
          <a href="#curators" className="header__link">Кураторам</a>
        </nav>

        <div className="header__auth">
          <Link to="/login" className="header__btn header__btn--login">Войти</Link>
          <Link to="/register" className="header__btn header__btn--register">Регистрация</Link>
        </div>

        <button
          className="header__burger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Меню"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              position: 'absolute',
              top: 'var(--header-height)',
              left: 0,
              right: 0,
              background: 'rgba(10,10,20,0.97)',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid var(--glass-border)',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <a href="#employers" className="header__link" onClick={() => setMobileOpen(false)}>Работодателям</a>
            <a href="#students" className="header__link" onClick={() => setMobileOpen(false)}>Студентам</a>
            <a href="#curators" className="header__link" onClick={() => setMobileOpen(false)}>Кураторам</a>
            <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
              <Link to="/login" className="header__btn header__btn--login" onClick={() => setMobileOpen(false)}>Войти</Link>
              <Link to="/register" className="header__btn header__btn--register" onClick={() => setMobileOpen(false)}>Регистрация</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;