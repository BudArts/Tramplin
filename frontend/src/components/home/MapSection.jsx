import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { api } from '../../services/api';
import 'leaflet/dist/leaflet.css';
import './MapSection.css';

// Координаты центра России для старта
const RUSSIA_CENTER = [61.524, 105.318];

function MapSection({ onAuthRequired }) {
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    api.getMapMarkers().then(data => setMarkers(data)).catch(() => {
      // Заглушка, если API пока не доступен
      setMarkers([{ id: 1, lat: 55.75, lng: 37.61, title: 'Стажировка в Москве' }]);
    });
  }, []);

  return (
    <section className="map-section" id="map">
      <div className="container">
        <h2 className="section-title text-center">Карта возможностей</h2>
        <div className="map-container">
          <MapContainer center={RUSSIA_CENTER} zoom={3} scrollWheelZoom={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {markers.map(marker => (
              <Marker 
                key={marker.id} 
                position={[marker.lat, marker.lng]}
                eventHandlers={{ click: onAuthRequired }}
              >
                <Popup>{marker.title}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </section>
  );
}

export default MapSection;