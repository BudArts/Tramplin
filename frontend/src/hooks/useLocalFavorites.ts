import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY_COMPANIES = 'tramplin_fav_companies';
const STORAGE_KEY_OPPORTUNITIES = 'tramplin_fav_opportunities';

export function useLocalFavorites() {
  const [favCompanyIds, setFavCompanyIds] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COMPANIES);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });

  const [favOpportunityIds, setFavOpportunityIds] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_OPPORTUNITIES);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COMPANIES, JSON.stringify([...favCompanyIds]));
  }, [favCompanyIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_OPPORTUNITIES, JSON.stringify([...favOpportunityIds]));
  }, [favOpportunityIds]);

  const toggleCompany = useCallback((id: number) => {
    setFavCompanyIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleOpportunity = useCallback((id: number) => {
    setFavOpportunityIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isCompanyFav = useCallback((id: number) => favCompanyIds.has(id), [favCompanyIds]);
  const isOpportunityFav = useCallback((id: number) => favOpportunityIds.has(id), [favOpportunityIds]);

  return {
    favCompanyIds,
    favOpportunityIds,
    toggleCompany,
    toggleOpportunity,
    isCompanyFav,
    isOpportunityFav,
  };
}