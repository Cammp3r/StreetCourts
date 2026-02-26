import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet';


function RecenterOnPosition({ position, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;
    map.setView(position, zoom, { animate: true });
  }, [map, position, zoom]);

  return null;
}

export function MapView({ detail }) {
  const fallbackCenter = useMemo(() => [50.4501, 30.5234], []); // Kyiv
  const [userPosition, setUserPosition] = useState(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        // Якщо доступ заборонений/помилка — лишаємо fallbackCenter
      },
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

  return (
    
    <div className="map-container">
      <div className="map-window">
        <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          <RecenterOnPosition position={userPosition} zoom={15} />

          {userPosition ? (
            <CircleMarker
              center={userPosition}
              radius={10}
              pathOptions={{ color: 'var(--accent-blue)', fillColor: 'var(--accent-blue)', fillOpacity: 0.35 }}
            />
          ) : null}
        </MapContainer>

  
      </div>
    </div>
  );
}
