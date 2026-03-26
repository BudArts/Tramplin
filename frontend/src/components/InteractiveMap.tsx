// frontend/src/components/InteractiveMap.tsx

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import type { OpportunityResponse, OpportunityType } from '../api/types';

// Тип для точки на карте
interface MapPoint {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  company_name?: string;
  type: OpportunityType;
}

const TYPE_COLORS: Record<OpportunityType, string> = {
  internship: '#33ff66',
  vacancy: '#33ccff',
  mentorship: '#ffcc33',
  event: '#ff3366',
};

const TYPE_LABELS: Record<OpportunityType, string> = {
  internship: 'Стажировки',
  vacancy: 'Вакансии',
  mentorship: 'Менторство',
  event: 'Мероприятия',
};

// Границы для ограничения перемещения карты
const MAP_BOUNDS: L.LatLngBoundsExpression = [
  [41.0, 19.0],
  [82.0, 190.0],
];

const MAX_BOUNDS: L.LatLngBoundsExpression = [
  [35.0, 10.0],
  [85.0, 200.0],
];

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      const bounds = L.latLngBounds(MAP_BOUNDS);
      const newCenter = L.latLng(center[0], center[1]);
      
      if (bounds.contains(newCenter)) {
        map.flyTo(center, zoom, { duration: 1.5 });
      } else {
        map.flyTo([55.75, 37.61], 5, { duration: 1.5 });
        alert('Выбранный город находится за пределами доступной области');
      }
    }
  }, [center, zoom, map]);
  return null;
}

function MapBounds() {
  const map = useMap();
  
  useEffect(() => {
    map.setMaxBounds(MAX_BOUNDS);
    map.setMinZoom(3);
    map.setMaxZoom(18);
  }, [map]);
  
  return null;
}

// ✅ ИСПРАВЛЕНО: создание иконки для одиночного маркера
function createMarkerIcon(type: OpportunityType): L.DivIcon {
  const color = TYPE_COLORS[type] || '#fff';
  return L.divIcon({
    className: 'custom-marker-icon',
    html: `
      <div style="
        width: 12px; 
        height: 12px; 
        background: ${color}; 
        border-radius: 50%; 
        box-shadow: 0 0 8px ${color}, 0 0 12px ${color};
        border: 1.5px solid white;
      "></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6],
  });
}

// ✅ ИСПРАВЛЕНО: создание иконки для кластера с правильным позиционированием
function createClusterIcon(cluster: any) {
  const count = cluster.getChildCount();
  let size = 40;
  let fontSize = 16;
  
  if (count > 10) size = 48;
  if (count > 50) size = 56;
  if (count > 100) size = 64;
  
  // Определяем цвет кластера в зависимости от количества
  let bgColor = '#33ccff';
  let borderColor = '#33ccff';
  if (count > 10) {
    bgColor = '#ffcc33';
    borderColor = '#ffcc33';
  }
  if (count > 50) {
    bgColor = '#ff3366';
    borderColor = '#ff3366';
  }
  
  return L.divIcon({
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: radial-gradient(circle, ${bgColor}, ${bgColor}dd);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: ${fontSize}px;
      color: white;
      border: 2px solid ${borderColor};
      box-shadow: 0 0 15px ${borderColor};
      backdrop-filter: blur(2px);
    ">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

interface InteractiveMapProps {
  opportunities?: OpportunityResponse[];
}

const InteractiveMap = ({ opportunities = [] }: InteractiveMapProps) => {
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [flyTo, setFlyTo] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const mapPoints = useMemo<MapPoint[]>(() => {
    return opportunities
      .filter(opp => opp.latitude && opp.longitude)
      .map(opp => ({
        id: opp.id,
        latitude: opp.latitude!,
        longitude: opp.longitude!,
        title: opp.title,
        company_name: opp.company?.name || opp.company_name,
        type: opp.type,
      }));
  }, [opportunities]);

  useEffect(() => {
    if (opportunities.length > 0) {
      setLoading(false);
    } else {
      const timer = setTimeout(() => setLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [opportunities]);

  const handleCitySearch = useCallback(async () => {
    if (!searchCity.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchCity)}&format=json&limit=1&countrycodes=ru&accept-language=ru`
      );
      const data = await response.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        
        const bounds = L.latLngBounds(MAP_BOUNDS);
        const cityPoint = L.latLng(lat, lon);
        
        if (bounds.contains(cityPoint)) {
          setFlyTo({
            center: [lat, lon],
            zoom: 12,
          });
          setShowSearch(false);
          setSearchCity('');
        } else {
          alert('Этот город находится за пределами доступной области карты');
        }
      } else {
        alert('Город не найден');
      }
    } catch (error) {
      console.error('Ошибка поиска города:', error);
      alert('Ошибка при поиске города');
    } finally {
      setIsSearching(false);
    }
  }, [searchCity]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCitySearch();
    }
  };

  const legendItems = useMemo(() => [
    { type: 'internship' as OpportunityType, label: 'Стажировки', color: TYPE_COLORS.internship },
    { type: 'vacancy' as OpportunityType, label: 'Вакансии', color: TYPE_COLORS.vacancy },
    { type: 'mentorship' as OpportunityType, label: 'Менторство', color: TYPE_COLORS.mentorship },
    { type: 'event' as OpportunityType, label: 'Мероприятия', color: TYPE_COLORS.event },
  ], []);

  return (
    <section className="map-section" id="map-section">
      <motion.div
        className="map-section__header"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        <h2 className="map-section__title">
          КАРТА ТВОИХ <span>ВОЗМОЖНОСТЕЙ</span>
        </h2>
        <p className="map-section__subtitle">
          Найди стажировки, вакансии и мероприятия рядом с тобой
        </p>
      </motion.div>

      <div className="container">
        <div className="map-section__map-wrapper">
          {loading ? (
            <div className="map-loading">
              <Loader2 size={32} className="spinner" />
              <span>Загрузка карты...</span>
            </div>
          ) : (
            <>
              <MapContainer
                center={[55.75, 37.61]}
                zoom={5}
                className="map-section__map"
                style={{ width: '100%', height: '100%' }}
                maxZoom={18}
                minZoom={3}
                zoomControl={true}
                scrollWheelZoom={true}
                doubleClickZoom={true}
                touchZoom={true}
                dragging={true}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                
                <MapBounds />
                
                {flyTo && <MapController center={flyTo.center} zoom={flyTo.zoom} />}

                <MarkerClusterGroup
                  chunkedLoading
                  iconCreateFunction={createClusterIcon}
                  maxClusterRadius={80}
                  spiderfyOnMaxZoom={true}
                  showCoverageOnHover={false}
                  spiderLegPolylineOptions={{ weight: 1.5, color: '#ff3366', opacity: 0.5 }}
                >
                  {mapPoints.map((point) => (
                    <Marker
                      key={point.id}
                      position={[point.latitude, point.longitude]}
                      icon={createMarkerIcon(point.type)}
                    >
                      <Tooltip 
                        direction="top" 
                        offset={[0, -10]} 
                        opacity={1} 
                        permanent={false}
                        className="custom-tooltip"
                      >
                        <div className="map-tooltip-card">
                          <strong>{point.title}</strong>
                          {point.company_name && (
                            <div className="map-tooltip-card__company">{point.company_name}</div>
                          )}
                          <div className="map-tooltip-card__type">{TYPE_LABELS[point.type]}</div>
                        </div>
                      </Tooltip>
                    </Marker>
                  ))}
                </MarkerClusterGroup>
              </MapContainer>

              <div className="map-section__city-search">
                {!showSearch ? (
                  <button 
                    className="map-section__city-search-btn"
                    onClick={() => setShowSearch(true)}
                  >
                    <MapPin size={20} />
                    <span>Найти город</span>
                  </button>
                ) : (
                  <div className="map-section__city-search-panel">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Введите название города..."
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      onKeyPress={handleKeyPress}
                      autoFocus
                    />
                    <button 
                      onClick={handleCitySearch}
                      disabled={isSearching}
                    >
                      {isSearching ? <Loader2 size={18} className="spinner" /> : <Search size={18} />}
                    </button>
                    <button 
                      className="map-section__city-search-close"
                      onClick={() => {
                        setShowSearch(false);
                        setSearchCity('');
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="map-section__legend">
          {legendItems.map(item => (
            <div key={item.type} className="map-section__legend-item">
              <span
                className="map-section__legend-dot"
                style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}` }}
              />
              <span className="map-section__legend-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InteractiveMap;