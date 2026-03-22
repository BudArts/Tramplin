import React, { useState, useEffect } from 'react';
import HeroSection from '../components/home/HeroSection';
import NavigationIcons from '../components/home/NavigationIcons';
import MapSection from '../components/home/MapSection';
import SectionBlock from '../components/home/SectionBlock';
import { FiAward, FiTrendingUp, FiStar } from 'react-icons/fi';

// Пробуем добавить префикс /api/v1, если основной не работает
const API_BASE = 'http://localhost:8000/api/v1'; 
// Если не сработает, попробуй поменять обратно на 'http://localhost:8000'

function HomePage() {
  const [opportunities, setOpportunities] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [activeTag, setActiveTag] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Формируем запросы
        const oppPath = activeTag 
          ? `/opportunities?tag=${encodeURIComponent(activeTag)}&limit=20`
          : `/opportunities?limit=20`;
        
        const empPath = `/employers?limit=10`;

        // Функция-помощник для обработки 404 и префиксов
        const smartFetch = async (path) => {
          let response = await fetch(`${API_BASE}${path}`);
          if (response.status === 404) {
            // Если с /api/v1 не вышло, пробуем без него
            const fallbackBase = 'http://localhost:8000';
            response = await fetch(`${fallbackBase}${path}`);
          }
          return response.json();
        };

        const [oppData, empData] = await Promise.all([
          smartFetch(oppPath).catch(() => ({ items: [] })),
          smartFetch(empPath).catch(() => ({ items: [] }))
        ]);

        console.log("Response Opps:", oppData);
        console.log("Response Emps:", empData);

        setOpportunities(oppData.items || []);
        setEmployers(empData.items || []);
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTag]);

  const handleAuthRequired = () => setAuthModalOpen(true);

  return (
    <div className="home-page">
      <HeroSection 
        onScrollDown={() => document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' })}
        scrollToSection={(id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
      />
      
      <NavigationIcons 
        sections={[
          { id: 'map', title: 'Карта' },
          { id: 'internships', title: 'Стажировки' },
          { id: 'vacancies', title: 'Вакансии' },
          { id: 'rating', title: 'Компании' },
          { id: 'tags', title: 'Поиск' }
        ]} 
        onSectionClick={(id) => {
          if (id === 'tags') {
            const tag = prompt("Введите навык:");
            if (tag) setActiveTag(tag);
          } else {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />

      <MapSection onAuthRequired={handleAuthRequired} />

      <SectionBlock 
        id="internships"
        title="Стажировки"
        subtitle="Программы развития"
        icon={<FiAward />}
        color="#E91E8C"
        data={opportunities.filter(o => o.is_internship)}
        isLoading={loading}
        onAuthRequired={handleAuthRequired}
        onTagClick={setActiveTag}
      />

      <SectionBlock 
        id="vacancies"
        title="Вакансии"
        subtitle="Работа для профи"
        icon={<FiTrendingUp />}
        color="#9B59B6"
        data={opportunities.filter(o => !o.is_internship)}
        isLoading={loading}
        onAuthRequired={handleAuthRequired}
        onTagClick={setActiveTag}
      />

      <SectionBlock 
        id="rating"
        title="Компании"
        subtitle="Лучшие работодатели"
        icon={<FiStar />}
        color="#7B2D8E"
        data={employers.map(e => ({
          id: e.inn,
          name: e.name,
          short_description: e.description,
          tags: [e.verification_status],
          company_name: "Verified"
        }))}
        isLoading={loading}
        onAuthRequired={handleAuthRequired}
      />

      {isAuthModalOpen && (
        <div className="modal-overlay" onClick={() => setAuthModalOpen(false)}>
          <div className="modal-box">
            <h2>Требуется вход</h2>
            <p>Авторизуйтесь, чтобы продолжить работу с платформой.</p>
            <button className="btn-primary" onClick={() => setAuthModalOpen(false)}>Понятно</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;