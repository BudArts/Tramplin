import { motion } from 'framer-motion';
import { Mail, Phone, MessageCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const Footer = () => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    candidates: false,
    employers: false,
    contacts: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <motion.footer
      className="footer"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="container">
        <div className="footer__inner">
          <div className="footer__top">
            {/* Бренд - всегда видимый */}
            <div className="footer__brand">
              <div className="footer__logo">
                <img 
                  src="/logo.png" 
                  alt="Трамплин" 
                  className="footer__logo-img"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<span class="footer__logo-text">Трамплин</span>';
                    }
                  }}
                />
                <img 
                  src="/codeins.png" 
                  alt="Трамплин" 
                  className="footer__logo-img2"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<span class="footer__logo-text">КодИнсайд</span>';
                    }
                  }}
                />
              </div>
              <p className="footer__brand-desc">
                Карьерная платформа нового поколения. Объединяем талантливых студентов
                и ведущие IT-компании для создания успешного будущего.
              </p>
            </div>

            {/* Соискателям - аккордеон на мобилке */}
            <div className="footer__col footer__col--mobile-accordion">
              <div 
                className="footer__col-header"
                onClick={() => toggleSection('candidates')}
              >
                <h4 className="footer__col-title">Соискателям</h4>
                <ChevronDown 
                  size={18} 
                  className={`footer__col-icon ${openSections.candidates ? 'footer__col-icon--open' : ''}`}
                />
              </div>
              <ul className={`footer__links ${openSections.candidates ? 'footer__links--open' : ''}`}>
                <li><a href="#" className="footer__link">Стажировки</a></li>
                <li><a href="#" className="footer__link">Вакансии</a></li>
                <li><a href="#" className="footer__link">Мероприятия</a></li>
                <li><a href="#" className="footer__link">Менторство</a></li>
              </ul>
            </div>

            {/* Работодателям - аккордеон на мобилке */}
            <div className="footer__col footer__col--mobile-accordion">
              <div 
                className="footer__col-header"
                onClick={() => toggleSection('employers')}
              >
                <h4 className="footer__col-title">Работодателям</h4>
                <ChevronDown 
                  size={18} 
                  className={`footer__col-icon ${openSections.employers ? 'footer__col-icon--open' : ''}`}
                />
              </div>
              <ul className={`footer__links ${openSections.employers ? 'footer__links--open' : ''}`}>
                <li><a href="#" className="footer__link">Разместить вакансию</a></li>
                <li><a href="#" className="footer__link">Поиск кандидатов</a></li>
                <li><a href="#" className="footer__link">Верификация</a></li>
                <li><a href="#" className="footer__link">Тарифы</a></li>
              </ul>
            </div>

            {/* Контакты - аккордеон на мобилке */}
            <div className="footer__col footer__col--mobile-accordion">
              <div 
                className="footer__col-header"
                onClick={() => toggleSection('contacts')}
              >
                <h4 className="footer__col-title">Контакты</h4>
                <ChevronDown 
                  size={18} 
                  className={`footer__col-icon ${openSections.contacts ? 'footer__col-icon--open' : ''}`}
                />
              </div>
              <ul className={`footer__links ${openSections.contacts ? 'footer__links--open' : ''}`}>
                <li>
                  <a href="mailto:info@tramplin.ru" className="footer__link footer__link--icon">
                    <Mail size={14} /> info@tramplin.ru
                  </a>
                </li>
                <li>
                  <a href="tel:+74997033949" className="footer__link footer__link--icon">
                    <Phone size={14} /> +7 (499) 703-39-49
                  </a>
                </li>
                <li>
                  <a href="#" className="footer__link footer__link--icon">
                    <MessageCircle size={14} /> Поддержка
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer__bottom">
            <p className="footer__copy">
              © {new Date().getFullYear()} Трамплин. Все права защищены.
            </p>
            <div className="footer__socials">
              <a href="#" className="footer__social">VK</a>
              <a href="#" className="footer__social">TG</a>
              <a href="#" className="footer__social">GH</a>
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;