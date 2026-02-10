export function CourtCardMini({ court }) {
  return (
    <div className={`court-card-mini${court.selected ? ' selected' : ''}`}>
      <img src={court.image} alt="Court" className="mini-img" />
      <div className="mini-info">
        <span className={court.badgeClassName}>{court.typeLabel}</span>
        <div className="court-name">{court.name}</div>
        <div className="court-address">{court.address}</div>
        <div className="live-indicator">
          <span className={court.statusDotClassName}></span>
          {court.statusText}
        </div>
      </div>
    </div>
  );
}
