import { useEffect, useMemo, useState, useRef } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { streamArrayChunks } from '../utils/streams';


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
  const [renderedCourts, setRenderedCourts] = useState([]);
  const courtsStreamAbortController = useRef(null);

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
        console.log('Geolocation success:', {
          accuracy: pos.coords.accuracy,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: new Date(pos.timestamp).toLocaleTimeString()
        });
        setUserPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      (error) => {
        console.error('Geolocation error:', {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0, // Всегда запрашивать свежую позицию, не кешировать
        timeout: 10_000, // 10 секунд для GPS
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (courtsStreamAbortController.current) {
      courtsStreamAbortController.current.abort();
    }

    courtsStreamAbortController.current = new AbortController();
    const signal = courtsStreamAbortController.current.signal;

    const isDev = import.meta.env.DEV;
    const streamChunkSize = isDev ? 5 : 35;
    const streamYieldDelayMs = isDev ? 16 : 0;

    setRenderedCourts([]);

    const streamMarkers = async () => {
      try {
        for await (const chunk of streamArrayChunks(courtsWithCoords, {
          chunkSize: streamChunkSize,
          signal,
          strategy: 'animationFrame',
          yieldDelayMs: streamYieldDelayMs,
        })) {
          if (signal.aborted) return;
          setRenderedCourts((prev) => prev.concat(chunk));
        }
      } catch (error) {
        if (signal.aborted) return;
        console.error('Error streaming map markers:', error);
      }
    };

    streamMarkers();

    return () => {
      if (courtsStreamAbortController.current) {
        courtsStreamAbortController.current.abort();
      }
    };
  }, [courtsWithCoords]);

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

          {renderedCourts.map((court) => {
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
