import { useMemo, useState, useEffect } from 'react';
import { displayFriendsWithRotation } from '../utils/generators';
import { FRIENDS } from '../data/mockData';


const DEFAULT_USER = {
  name: 'Макс',
  handle: '@max',
  city: 'Київ',
  bio: 'Люблю вуличний спорт і нові майданчики. Пишу короткі відгуки після ігор.',
  favoriteSports: ['🏀 Баскетбол', '⚽ Футбол'],
  stats: {
    checkins: 18,
    matches: 42,
    reviews: 7,
  },
  recentCheckins: [
    {
      id: 'kpi-1',
      courtName: 'Поляна КПІ',
      timeText: 'Сьогодні, 19:00',
      statusText: 'Зібралось багато людей 🔥',
    },
    {
      id: 'xpark-1',
      courtName: 'X-Park Arena',
      timeText: 'Вчора, 18:00',
      statusText: 'Легка гра, вільне поле',
    },
  ],
  favoriteCourts: [
    {
      id: 'kpi',
      name: 'Поляна КПІ',
      address: 'вул. Політехнічна, 14',
      tagClassName: 'profile-tag tag-basket',
      tagText: '🏀 Баскетбол',
    },
    {
      id: 'xpark',
      name: 'X-Park Arena',
      address: 'Парк Муромець',
      tagClassName: 'profile-tag tag-foot',
      tagText: '⚽ Футбол',
    },
  ],
};

export function UserProfilePage({ user }) {
  const resolvedUser = useMemo(() => user ?? DEFAULT_USER, [user]);

  const [currentFriend, setCurrentFriend] = useState(FRIENDS[0] || null);

  const initials = useMemo(() => {
    const parts = String(resolvedUser.name ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const first = parts[0]?.[0] ?? 'U';
    const second = parts[1]?.[0] ?? '';
    return (first + second).toUpperCase();
  }, [resolvedUser.name]);

  // запускаємо генератор для ротації друзів
  useEffect(() => {
    const stopRotation = displayFriendsWithRotation(
      FRIENDS,
      (friend) => {
        setCurrentFriend(friend);
      },
      3000 // 3 секунди інтервал між друзями
    );

    return () => {
      stopRotation(); // очищуємо таймер при розмонтуванні
    };
  }, []);

  return (
    <div className="app">
      

      <div className="main-container">
        <aside className="profile-sidebar">
          <div className="profile-sidebar-header">
            <div className="profile-user">
              <div className="profile-avatar" aria-hidden="true">
                {initials}
              </div>

              <div className="profile-user-meta">
                <div className="profile-user-name">{resolvedUser.name}</div>
                <div className="profile-user-handle">{resolvedUser.handle} • {resolvedUser.city}</div>
              </div>
            </div>

            <p className="profile-bio">{resolvedUser.bio}</p>

            <div className="profile-stats">
              <div className="profile-stat">
                <div className="profile-stat-value">{resolvedUser.stats.checkins}</div>
                <div className="profile-stat-label">Чекіни</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value">{resolvedUser.stats.matches}</div>
                <div className="profile-stat-label">Матчі</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value">{resolvedUser.stats.reviews}</div>
                <div className="profile-stat-label">Відгуки</div>
              </div>
            </div>

            <div className="profile-section">
              <div className="profile-section-title">Улюблені види спорту</div>
              <div className="profile-chips">
                {resolvedUser.favoriteSports.map((label) => (
                  <span key={label} className="profile-chip">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="profile-content">
          <div className="profile-content-inner">
            <div className="profile-page-title">Мій профіль</div>

            <section className="profile-section">
              <div className="profile-section-title">Останні чекіни</div>

              <div className="profile-cards">
                {resolvedUser.recentCheckins.map((item) => (
                  <article key={item.id} className="profile-card">
                    <div className="profile-card-title">{item.courtName}</div>
                    <div className="profile-card-subtitle">{item.timeText}</div>
                    <div className="profile-card-text">{item.statusText}</div>
                  </article>
                ))}
              </div>
            </section>

            <section className="profile-section">
              <div className="profile-section-title">Друзі онлайн</div>

              {currentFriend ? (
                <div className="profile-cards">
                  <article className="profile-card" key={currentFriend.id}>
                    <div className="profile-card-row">
                      <div>
                        <div className="profile-card-title">
                          {currentFriend.sport} {currentFriend.name}
                        </div>
                        <div className="profile-card-subtitle">{currentFriend.handle}</div>
                        <div className="profile-card-text">{currentFriend.status}</div>
                      </div>
                    </div>
                  </article>
                </div>
              ) : (
                <p>Немає друзів онлайн</p>
              )}
            </section>

            <section className="profile-section">
              <div className="profile-section-title">Улюблені майданчики</div>

              <div className="profile-cards">
                {resolvedUser.favoriteCourts.map((court) => (
                  <article key={court.id} className="profile-card">
                    <div className="profile-card-row">
                      <div>
                        <div className="profile-card-title">{court.name}</div>
                        <div className="profile-card-subtitle">{court.address}</div>
                      </div>
                      <span className={court.tagClassName}>{court.tagText}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
