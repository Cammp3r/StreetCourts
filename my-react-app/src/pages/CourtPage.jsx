import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { COURTS } from '../data/mockData';
import { memoizedIsCommentLongEnough } from '../utils/commentValidation';
import {
  getCourtImage,
  getCourtStatusDotClassName,
  getCourtStatusText,
  getCourtTypeLabel,
} from '../utils/courtPresentation';



function loadComments(courtId) {
  if (!courtId) return [];
  try {
    const raw = localStorage.getItem(`court_comments_${courtId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveComments(courtId, comments) {
  if (!courtId) return;
  try {
    localStorage.setItem(`court_comments_${courtId}`, JSON.stringify(comments));
  } catch {
  }
}

export function CourtPage() {
  const { courtId } = useParams();

  const court = useMemo(
    () => COURTS.find((item) => item.id === courtId),
    [courtId]
  );

  const [comments, setComments] = useState(() => loadComments(courtId));
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');

  const image = getCourtImage(court);
  const typeLabel = getCourtTypeLabel(court);
  const statusDotClassName = getCourtStatusDotClassName(court);
  const statusText = getCourtStatusText(court);

  useEffect(() => {
    setComments(loadComments(courtId));
  }, [courtId]);

  if (!court) {
    return (
      <div className="court-page">
        <div className="court-page-inner">
          <h2 className="court-page-title">Майданчик не знайдено</h2>
          <p className="court-page-subtitle">
            Можливо, посилання застаріло або майданчик було видалено.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedText = text.trim();
    const trimmedAuthor = author.trim();

    if (!memoizedIsCommentLongEnough(trimmedText)) return;

    const newComment = {
      id: Date.now(),
      author: trimmedAuthor || 'Анонім',
      text: trimmedText,
      createdAt: new Date().toISOString(),
    };

    const nextComments = [newComment, ...comments];
    setComments(nextComments);
    saveComments(court.id, nextComments);

    setText('');
    setAuthor('');
  };

  return (
    <div className="court-page">
      <div className="court-page-inner">
        <header className="court-page-header">
          <img src={image} alt={court.name} className="court-page-img" />
          <div className="court-page-header-info">
            <div className="court-page-type">{typeLabel}</div>
            <h1 className="court-page-title">{court.name}</h1>
            <p className="court-page-subtitle">{court.address}</p>
            <div className="court-page-status">
              <span className={statusDotClassName}></span>
              <span>{statusText}</span>
            </div>
          </div>
        </header>

        <section className="court-comments-section">
          <h2 className="court-section-title">Коментарі до майданчика</h2>

          <form className="court-comment-form" onSubmit={handleSubmit}>
            <div className="court-comment-row">
              <input
                type="text"
                placeholder="Ваше ім'я (необов'язково)"
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                className="court-input"
              />
            </div>
            <div className="court-comment-row">
              <textarea
                placeholder="Залиште свій відгук або коментар про цей майданчик..."
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="court-textarea"
                rows={3}
              />
            </div>
            <div className="court-comment-actions">
              <button type="submit" className="court-submit-btn">
                Додати коментар
              </button>
            </div>
          </form>

          <div className="court-comments-list">
            {comments.length === 0 ? (
              <p className="court-empty">Поки що немає жодного коментаря. Будьте першими!</p>
            ) : (
              comments.map((comment) => (
                <article key={comment.id} className="court-comment-card">
                  <div className="court-comment-header">
                    <div className="court-comment-author">{comment.author}</div>
                    {comment.createdAt ? (
                      <div className="court-comment-date">
                        {new Date(comment.createdAt).toLocaleString('uk-UA', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    ) : null}
                  </div>
                  <p className="court-comment-text">{comment.text}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
