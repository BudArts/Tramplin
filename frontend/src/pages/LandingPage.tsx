// frontend/src/pages/LandingPage.tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import CategoryNav from '../components/CategoryNav';
import InteractiveMap from '../components/InteractiveMap';
import OpportunityList, { OpportunityListRef } from '../components/OpportunityList';
import CompanyRatingSection from '../components/CompanyRatingSection';
import AuthModal from '../components/AuthModal';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import type { OpportunityResponse, OpportunityType } from '../api/types';

export interface Filters {
  search: string;
  type?: 'internship' | 'vacancy' | 'mentorship' | 'event';
  workFormat?: 'office' | 'hybrid' | 'remote';
  city: string;
  salaryMin?: number;
  salaryMax?: number;
}

interface LandingPageProps {
  onOpenAuthModal?: (mode: 'login' | 'register') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuthModal }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [displayedOpportunities, setDisplayedOpportunities] = useState<OpportunityResponse[]>([]);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: undefined,
    workFormat: undefined,
    city: '',
    salaryMin: undefined,
    salaryMax: undefined,
  });

  const opportunityListRef = useRef<OpportunityListRef>(null);

  // ВАЖНО: редирект авторизованных студентов
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === 'student') {
        navigate('/student/profile', { replace: true });
      }
    }
  }, [isAuthenticated, user, loading, navigate]);

  const handleOpenAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleCloseAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const handleFilterChange = useCallback((partial: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...partial }));
  }, []);

  const handleFilterByType = useCallback(
    (type: OpportunityType | undefined) => {
      handleFilterChange({ type });
      if (type) {
        setActiveCategory(type);
      } else {
        setActiveCategory('all');
      }
    },
    [handleFilterChange]
  );

  const handleFilterChangeWithSync = useCallback(
    (partial: Partial<Filters>) => {
      handleFilterChange(partial);
      if ('type' in partial) {
        if (partial.type) {
          setActiveCategory(partial.type);
        } else {
          setActiveCategory('all');
        }
      }
    },
    [handleFilterChange]
  );

  const handleDataUpdate = useCallback((opportunities: OpportunityResponse[]) => {
    setDisplayedOpportunities(opportunities);
  }, []);

  const handleShowMore = useCallback(() => {
    handleOpenAuthModal('register');
  }, []);

  return (
    <div className="landing-page">
      <Header onOpenAuthModal={handleOpenAuthModal} />
      <main>
        <HeroSection />

        <CategoryNav
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          onFilterByType={handleFilterByType}
        />

        <div id="map-section">
          <InteractiveMap opportunities={displayedOpportunities} />
        </div>

        <OpportunityList
          ref={opportunityListRef}
          filters={filters}
          onFilterChange={handleFilterChangeWithSync}
          favorites={{
            isOpportunityFav: () => false,
            toggleOpportunity: () => {},
          }}
          onShowMore={handleShowMore}
          isMainPage={true}
          onDataUpdate={handleDataUpdate}
        />

        <CompanyRatingSection />
      </main>
      <Footer />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleCloseAuthModal}
        defaultMode={authModalMode}
      />
    </div>
  );
};

export default LandingPage;