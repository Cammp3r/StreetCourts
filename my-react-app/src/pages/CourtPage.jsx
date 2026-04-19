import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { COURTS } from '../data/mockData';
import { memoizedIsCommentLongEnough } from '../utils/commentValidation';
import { createCourtComment, fetchCourtComments } from '../utils/commentsApi';
import {
  getCourtImage,
  getCourtStatusDotClassName,
  getCourtStatusText,
  getCourtTypeLabel,
} from '../utils/courtPresentation';


export function CourtPage() {
  const { courtId } = useParams();

  const court = useMemo(
    () => COURTS.find((item) => item.id === courtId),
    [courtId]
  );

  const [comments, setComments] = useState([]);
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');

  const image = getCourtImage(court);
  const typeLabel = getCourtTypeLabel(court);
  const statusDotClassName = getCourtStatusDotClassName(court);
  const statusText = getCourtStatusText(court);

  useEffect(() => {
    if (!courtId) {
      setComments([]);
      setCommentsError('');
      setCommentsLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    const loadCourtComments = async () => {
      setCommentsLoading(true);
      setCommentsError('');

      try {
        const nextComments = await fetchCourtComments(courtId, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setComments(nextComments);
        }
      } catch {
        if (!controller.signal.aborted) {
          setComments([]);
          setCommentsError('Не вдалося завантажити коментарі з JSON-бази.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setCommentsLoading(false);
        }
      }
    };

    loadCourtComments();

    return () => {
      controller.abort();
    };
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

    if (!memoizedIsCommentLongEnough(trimmedText, comments)) return;

    const saveComment = async () => {
      try {
        const savedComment = await createCourtComment(court.id, {
          author: trimmedAuthor || 'Анонім',
          text: trimmedText,
        });

        if (savedComment) {
          setComments((currentComments) => [savedComment, ...currentComments]);
          setText('');
          setAuthor('');
          setCommentsError('');
        }
      } catch {
        setCommentsError('Не вдалося зберегти коментар у JSON-базі.');
      }
    };

    saveComment();
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
            {commentsLoading ? (
              <p className="court-empty">Завантажуємо коментарі...</p>
            ) : commentsError ? (
              <p className="court-empty">{commentsError}</p>
            ) : comments.length === 0 ? (
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
