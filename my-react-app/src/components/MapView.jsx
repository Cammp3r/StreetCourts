import { CourtDetailPanel } from './CourtDetailPanel';

export function MapView({ detail }) {
  return (
    <div className="map-container">
      <div className="map-marker marker-basket">🏀</div>
      <div className="map-marker marker-foot">⚽</div>

      <CourtDetailPanel detail={detail} />
    </div>
  );
}
