const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=200&q=80';

const DEFAULT_STATUS_TEXT = 'Зараз: Невідомо (OSM)';
const DEFAULT_STATUS_DOT_CLASS = 'dot free';

function normalizeSport(court) {
  const sport = court?.sport;
  if (sport === 'basketball' || sport === 'football' || sport === 'volleyball') return sport;

  const typeLabel = String(court?.typeLabel ?? '').toLowerCase();
  if (typeLabel.includes('баскет')) return 'basketball';
  if (typeLabel.includes('футбол')) return 'football';
  if (typeLabel.includes('волей')) return 'volleyball';

  return 'basketball';
}

export function getCourtTypeLabel(court) {
  if (typeof court?.typeLabel === 'string' && court.typeLabel.trim()) return court.typeLabel;

  const sport = normalizeSport(court);
  if (sport === 'football') return 'Футбол';
  if (sport === 'volleyball') return 'Волейбол';
  return 'Баскетбол';
}

export function getCourtBadgeClassName(court) {
  if (typeof court?.badgeClassName === 'string' && court.badgeClassName.trim()) {
    return court.badgeClassName;
  }

  const sport = normalizeSport(court);
  if (sport === 'football') return 'court-type-badge badge-foot';
  return 'court-type-badge badge-basket';
}

export function getCourtImage(court) {
  if (typeof court?.image === 'string' && court.image.trim()) return court.image;
  return DEFAULT_IMAGE;
}

export function getCourtStatusText(court) {
  if (typeof court?.statusText === 'string' && court.statusText.trim()) return court.statusText;
  return DEFAULT_STATUS_TEXT;
}

export function getCourtStatusDotClassName(court) {
  if (typeof court?.statusDotClassName === 'string' && court.statusDotClassName.trim()) {
    return court.statusDotClassName;
  }
  return DEFAULT_STATUS_DOT_CLASS;
}
