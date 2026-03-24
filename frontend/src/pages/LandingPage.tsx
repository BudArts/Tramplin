import { useState, useCallback, useRef } from 'react';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import CategoryNav from '../components/CategoryNav';
import InteractiveMap from '../components/InteractiveMap';
import OpportunityList, { OpportunityListRef } from '../components/OpportunityList';
import CompanyRatingSection from '../components/CompanyRatingSection';
import AuthModal from '../components/AuthModal';
import Footer from '../components/Footer';
import type { OpportunityResponse, OpportunityType } from '../api/types';

export interface Filters {
  search: string;
  type?: 'internship' | 'vacancy' | 'mentorship' | 'event';
  workFormat?: 'office' | 'hybrid' | 'remote';
  city: string;
  salaryMin?: number;
  salaryMax?: number;
}

const LandingPage = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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
    setIsAuthModalOpen(true);
  }, []);

  return (
    <div className="landing-page">
      <Header />
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
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default LandingPage;