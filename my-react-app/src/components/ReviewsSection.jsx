export function ReviewsSection({ title, reviews }) {
  return (
    <div className="reviews-section">
      <h3>{title}</h3>
      <div style={{ marginTop: '15px' }}>
        {reviews.map((review) => (
          <div key={review.id} className="review-card">
            <div className="review-header">
              <span>{review.author}</span>
              <span className="stars">{review.stars}</span>
            </div>
            <p className="review-text">{review.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
