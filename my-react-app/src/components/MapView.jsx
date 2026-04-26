import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';


function RecenterOnPosition({ position, zoom, enabled = true }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;
    if (!position) return;
    map.setView(position, zoom, { animate: true });
  }, [enabled, map, position, zoom]);

  return null;
}

function RecenterOnCourt({ court, zoom = 16 }) {
  const map = useMap();

  useEffect(() => {
    if (!court) return;
    if (typeof court?.lat !== 'number' || typeof court?.lon !== 'number') return;

    const nextZoom = Math.max(map.getZoom(), zoom);
    map.setView([court.lat, court.lon], nextZoom, { animate: true });
  }, [court, map, zoom]);

  return null;
}

export function MapView({ courts = [], selectedCourtId, onSelectCourt }) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const fallbackCenter = useMemo(() => [50.4501, 30.5234], []); // Kyiv
  const [userPosition, setUserPosition] = useState(null);

  const courtsWithCoords = useMemo(() => {
    if (!Array.isArray(courts)) return [];
    return courts.filter((court) => (
      typeof court?.lat === 'number' &&
      typeof court?.lon === 'number'
    ));
  }, [courts]);

  const selectedCourt = useMemo(() => {
    if (!selectedCourtId) return null;
    return courtsWithCoords.find((court) => court.id === selectedCourtId) ?? null;
  }, [courtsWithCoords, selectedCourtId]);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const center = userPosition ?? fallbackCenter;
  const zoom = userPosition ? 15 : 12;

  const tileLayerUrl = theme === 'dark'
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    
    <div className="map-container">
      <div className="map-window">
        <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          
          <TileLayer
            url={tileLayerUrl}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          <RecenterOnPosition position={userPosition} zoom={15} enabled={!selectedCourtId} />

          <RecenterOnCourt court={selectedCourt} zoom={16} />

          {userPosition ? (
            <CircleMarker
              center={userPosition}
              radius={10}
              pathOptions={{ color: 'var(--accent-blue)', fillColor: 'var(--accent-blue)', fillOpacity: 0.35 }}
            />
          ) : null}

          {courtsWithCoords.map((court) => {
            const isSelected = court.id === selectedCourtId;

            let color = 'var(--accent-orange)';
            if (court?.sport === 'football') color = 'var(--accent-green)';
            if (court?.sport === 'volleyball') color = 'var(--accent-yellow)';

            return (
              <CircleMarker
                key={court.id}
                center={[court.lat, court.lon]}
                radius={isSelected ? 8 : 6}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: isSelected ? 0.9 : 0.65,
                  weight: isSelected ? 2 : 1,
                }}
                eventHandlers={{
                  click: () => {
                    onSelectCourt?.(court);
                    if (court?.id) {
                      navigate(`/courts/${court.id}`);
                    }
                  },
                }}
              />
            );
          })}
        </MapContainer>

  
      </div>
    </div>
  );
}
