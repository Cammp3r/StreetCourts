import { useMemo, useState, useEffect } from 'react';
import { displayFriendsWithRotation } from 'streetcourts-lib';
import { FRIENDS } from '../data/mockData';

const DEFAULT_USER = {
  name: 'Макс',
  handle: '@max',
  city: 'Київ',
  age: '24',
  heightCm: '180',
  weightKg: '78',
  favoriteSport: '🏀 Баскетбол',
  favoriteSports: ['🏀 Баскетбол', '⚽ Футбол'],
  bio: 'Люблю вуличний спорт і нові майданчики. Пишу короткі відгуки після ігор.',
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

const EMPTY_FORM = {
  name: '',
  age: '',
  heightCm: '',
  weightKg: '',
  favoriteSport: '',
  bio: '',
};

export function UserProfilePage({ user, onSaveProfile }) {
  const isLoggedIn = Boolean(user);
  const authBase = import.meta.env.VITE_AUTH_BASE || 'http://localhost:4000';

  const resolvedUser = useMemo(() => {
    if (!user) return DEFAULT_USER;

    return {
      ...DEFAULT_USER,
      ...user,
      stats: {
        ...DEFAULT_USER.stats,
        ...(user.stats || {}),
      },
      favoriteSports: user.favoriteSports || (user.favoriteSport ? [user.favoriteSport] : DEFAULT_USER.favoriteSports),
      recentCheckins: user.recentCheckins || DEFAULT_USER.recentCheckins,
      favoriteCourts: user.favoriteCourts || DEFAULT_USER.favoriteCourts,
      handle: user.handle || DEFAULT_USER.handle,
      city: user.city || DEFAULT_USER.city,
      bio: user.bio || DEFAULT_USER.bio,
      age: user.age || DEFAULT_USER.age,
      heightCm: user.heightCm || DEFAULT_USER.heightCm,
      weightKg: user.weightKg || DEFAULT_USER.weightKg,
      favoriteSport: user.favoriteSport || DEFAULT_USER.favoriteSport,
    };
  }, [user]);

  const [currentFriend, setCurrentFriend] = useState(FRIENDS[0] || null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saveStatus, setSaveStatus] = useState('');

  const initials = useMemo(() => {
    const parts = String(resolvedUser.name ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const first = parts[0]?.[0] ?? 'U';
    const second = parts[1]?.[0] ?? '';
    return (first + second).toUpperCase();
  }, [resolvedUser.name]);

  useEffect(() => {
    const stopRotation = displayFriendsWithRotation(
      FRIENDS,
      (friend) => {
        setCurrentFriend(friend);
      },
      3000
    );

    return () => {
      stopRotation();
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setFormData(EMPTY_FORM);
      return;
    }

    setFormData({
      name: resolvedUser.name || '',
      age: resolvedUser.age || '',
      heightCm: resolvedUser.heightCm || '',
      weightKg: resolvedUser.weightKg || '',
      favoriteSport: resolvedUser.favoriteSport || (resolvedUser.favoriteSports?.[0] || ''),
      bio: resolvedUser.bio || '',
    });
  }, [isLoggedIn, resolvedUser.age, resolvedUser.bio, resolvedUser.favoriteSport, resolvedUser.favoriteSports, resolvedUser.heightCm, resolvedUser.name, resolvedUser.weightKg]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!isLoggedIn) return;

    const nextProfile = {
      name: formData.name.trim() || resolvedUser.name,
      age: formData.age.trim(),
      heightCm: formData.heightCm.trim(),
      weightKg: formData.weightKg.trim(),
      favoriteSport: formData.favoriteSport.trim(),
      favoriteSports: formData.favoriteSport.trim() ? [formData.favoriteSport.trim()] : [],
      bio: formData.bio.trim(),
      handle: resolvedUser.handle,
      city: resolvedUser.city,
    };

    onSaveProfile?.(nextProfile);
    setSaveStatus('Збережено');
    window.setTimeout(() => setSaveStatus(''), 2000);
  };

  return (
    <div className="app">
      <div className="main-container">
        {isLoggedIn ? (
          <>
            <aside className="profile-sidebar">
              <div className="profile-sidebar-header">
                <div className="profile-user">
                  {resolvedUser.picture ? (
                    <img src={resolvedUser.picture} alt={resolvedUser.name} className="profile-avatar-img" />
                  ) : (
                    <div className="profile-avatar" aria-hidden="true">{initials}</div>
                  )}

                  <div className="profile-user-meta">
                    <div className="profile-user-name">{resolvedUser.name}</div>
                    <div className="profile-user-handle">{resolvedUser.handle} • {resolvedUser.city}</div>
                  </div>
                </div>

                <p className="profile-bio">{resolvedUser.bio}</p>

                <div className="profile-stats">
                  <div className="profile-stat">
                    <div className="profile-stat-value">{resolvedUser.age || '—'}</div>
                    <div className="profile-stat-label">Вік</div>
                  </div>
                  <div className="profile-stat">
                    <div className="profile-stat-value">{resolvedUser.heightCm || '—'}</div>
                    <div className="profile-stat-label">Зріст</div>
                  </div>
                  <div className="profile-stat">
                    <div className="profile-stat-value">{resolvedUser.weightKg || '—'}</div>
                    <div className="profile-stat-label">Вага</div>
                  </div>
                </div>

                <div className="profile-section">
                  <div className="profile-section-title">Улюблений вид спорту</div>
                  <div className="profile-chips">
                    <span className="profile-chip">{resolvedUser.favoriteSport || 'Не вказано'}</span>
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

                <section className="profile-section profile-edit-card">
                  <div className="profile-section-title">Редагування профілю</div>
                  <form className="profile-form" onSubmit={handleSubmit}>
                    <div className="profile-form-grid">
                      <label className="profile-field">
                        <span>Ім&apos;я</span>
                        <input
                          className="profile-input"
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Наприклад, Олексій"
                        />
                      </label>

                      <label className="profile-field">
                        <span>Вік</span>
                        <input
                          className="profile-input"
                          type="number"
                          min="1"
                          name="age"
                          value={formData.age}
                          onChange={handleChange}
                          placeholder="Наприклад, 24"
                        />
                      </label>

                      <label className="profile-field">
                        <span>Зріст, см</span>
                        <input
                          className="profile-input"
                          type="number"
                          min="1"
                          name="heightCm"
                          value={formData.heightCm}
                          onChange={handleChange}
                          placeholder="Наприклад, 180"
                        />
                      </label>

                      <label className="profile-field">
                        <span>Вага, кг</span>
                        <input
                          className="profile-input"
                          type="number"
                          min="1"
                          name="weightKg"
                          value={formData.weightKg}
                          onChange={handleChange}
                          placeholder="Наприклад, 78"
                        />
                      </label>

                      <label className="profile-field profile-field-wide">
                        <span>Улюблений вид спорту</span>
                        <input
                          className="profile-input"
                          type="text"
                          name="favoriteSport"
                          value={formData.favoriteSport}
                          onChange={handleChange}
                          placeholder="Наприклад, Баскетбол"
                        />
                      </label>

                      <label className="profile-field profile-field-wide">
                        <span>Bio</span>
                        <textarea
                          className="profile-textarea"
                          name="bio"
                          value={formData.bio}
                          onChange={handleChange}
                          rows="4"
                          placeholder="Коротко розкажи про себе"
                        />
                      </label>
                    </div>

                    <div className="profile-form-actions">
                      {saveStatus ? <span className="profile-save-status">{saveStatus}</span> : <span />}
                      <button className="profile-save-btn" type="submit">Зберегти</button>
                    </div>
                  </form>
                </section>

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
          </>
        ) : (
          <div className="profile-guest-screen">
            <a className="profile-register-link" href={`${authBase}/auth/google`}>
              Реєстрація / Увійти через Google
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
