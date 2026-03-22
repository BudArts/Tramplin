import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import './Header.css'

function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      className={`header ${scrolled ? 'header--scrolled' : ''}`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="header__inner container">
        <Link to="/" className="header__logo">
          <img src="/images/logo.png" alt="Трамплин" className="header__logo-img" />
        </Link>

        <nav className={`header__nav ${mobileOpen ? 'header__nav--open' : ''}`}>
          <a href="#" className="header__nav-link">Работодателям</a>
          <a href="#" className="header__nav-link header__nav-link--active">Студентам</a>
          <a href="#" className="header__nav-link">Кураторам</a>

          {/* Мобильные кнопки внутри меню */}
          <div className="header__auth header__auth--mobile">
            <button className="header__btn header__btn--login" onClick={() => navigate('/login')}>
              Войти
            </button>
            <button className="header__btn header__btn--register" onClick={() => navigate('/register')}>
              Регистрация
            </button>
          </div>
        </nav>

        <div className="header__auth header__auth--desktop">
          <button className="header__btn header__btn--login" onClick={() => navigate('/login')}>
            Войти
          </button>
          <button className="header__btn header__btn--register" onClick={() => navigate('/register')}>
            Регистрация
          </button>
        </div>

        <button
          className={`header__burger ${mobileOpen ? 'header__burger--active' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Меню"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Нижняя линия-подсветка */}
      <div className="header__bottom-line" />
    </motion.header>
  )
}

export default Header