import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getCourtBadgeClassName,
  getCourtImage,
  getCourtStatusDotClassName,
  getCourtStatusText,
  getCourtTypeLabel,
} from "../utils/courtPresentation";
import { MiniCourtCalendar } from './MiniCourtCalendar';
import { bookingEvents } from '../utils/bookingEvents';

export function CourtCardMini({ court, isSelected = false, onSelect }) {
  const [statusMessage, setStatusMessage] = useState('');
  const messageTimerRef = useRef(null);
  const image = getCourtImage(court);
  const typeLabel = getCourtTypeLabel(court);
  const badgeClassName = getCourtBadgeClassName(court);
  const statusDotClassName = getCourtStatusDotClassName(court);
  const statusText = getCourtStatusText(court);

  useEffect(() => {
    if (!court?.id) return undefined;

    const unsubscribe = bookingEvents.subscribe((message) => {
      if (message.type !== 'booking:registered' || message.courtId !== court.id) return;

      if (messageTimerRef.current) {
        window.clearTimeout(messageTimerRef.current);
      }

      setStatusMessage(message.message || 'Користувач успішно зареєструвався');

      messageTimerRef.current = window.setTimeout(() => {
        setStatusMessage('');
        messageTimerRef.current = null;
      }, 2500);
    });

    return () => {
      unsubscribe();

      if (messageTimerRef.current) {
        window.clearTimeout(messageTimerRef.current);
      }
    };
  }, [court?.id]);

  const handleSelect = () => {
    onSelect?.(court);
  };

  return (
    <div className={`court-card-mini${isSelected ? ' selected' : ''}`}>
      <Link
        to={`/courts/${court.id}`}
        className="court-card-mini-link"
        onClick={handleSelect}
      >
        <img src={image} alt={court?.name || 'Court'} className="mini-img" />
        <div className="mini-info">
          <span className={badgeClassName}>{typeLabel}</span>
          <div className="court-name">{court.name}</div>
          <div className="court-address">{court.address}</div>
          {court.popularity && (
            <div style={{ fontSize: '12px', color: '#868e96', marginBottom: '4px' }}>
              Популярність: {court.popularity}%
            </div>
          )}
          <div className="live-indicator">
            <span className={statusDotClassName}></span>
            {statusText}
          </div>
        </div>
      </Link>

      <MiniCourtCalendar courtId={court.id} />

      {statusMessage ? (
        <div className="court-register-success" role="status" aria-live="polite">
          {statusMessage}
        </div>
      ) : null}
    </div>
  );
}
