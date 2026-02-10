import { ReviewsSection } from './ReviewsSection';

export function CourtDetailPanel({ detail }) {
  return (
    <div className="court-detail-panel">
      <img
        src={detail.headerImage}
        alt="Detail"
        className="detail-header-img"
      />

      <div className="detail-content">
        <h1>{detail.title}</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          {detail.subtitle}
        </p>

        <div className="checkin-widget">
          <div className="widget-title">
            <span>Планування гри</span>
          </div>

          <div className="status-bar-large">
            <span className="dot busy" style={{ marginRight: '10px' }}></span>
            {detail.planningStatusText}
          </div>

          <p
            style={{
              fontSize: '0.9rem',
              marginBottom: '10px',
              fontWeight: '600',
            }}
          >
            Обери свій час:
          </p>

          <div className="time-selector">
            {detail.timeSlots.map((slot, index) => (
              <div
                key={slot}
                className={`time-chip${
                  index === detail.selectedTimeSlotIndex ? ' selected' : ''
                }`}
              >
                {slot}
              </div>
            ))}
          </div>

          <button className="btn-checkin">{detail.checkinButtonText}</button>
        </div>

        <ReviewsSection title={detail.reviewsTitle} reviews={detail.reviews} />
      </div>
    </div>
  );
}
