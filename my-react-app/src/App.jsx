import React from 'react';
import './App.css';

function App() {

  return (
    <div className="app">
      {/* --- 1. Навігація --- */}
      <nav className="navbar">
        <div className="logo">StreetCourts</div>
        <div className="nav-menu">
          <a href="#" className="active">Карта</a>
          <a href="#">Мій профіль</a>
        </div>
      </nav>

      {/* --- 2. Головний контейнер --- */}
      <div className="main-container">
        
        {/* --- A. Лівий сайдбар (Список) --- */}
        <div className="sidebar">
          <div className="sidebar-header">
            <h2>Знайди гру поруч</h2>
            {/* Фільтри (Тільки дизайн кнопок) */}
            <div className="filters">
              <button className="filter-btn active-basketball">🏀 Баскетбол</button>
              <button className="filter-btn active-football">⚽ Футбол</button>
              <button className="filter-btn">🏐 Волей</button>
            </div>
          </div>

          <div className="courts-list">
            {/* Картка 1 (Активна) */}
            <div className="court-card-mini selected">
              <img src="https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=200&q=80" alt="Court" className="mini-img" />
              <div className="mini-info">
                <span className="court-type-badge badge-basket">Баскетбол</span>
                <div className="court-name">Поляна КПІ</div>
                <div className="court-address">вул. Політехнічна, 14</div>
                {/* Індикатор завантаженості */}
                <div className="live-indicator">
                  <span className="dot busy"></span>
                  Зараз: 12+ людей (Тісно)
                </div>
              </div>
            </div>

            {/* Картка 2 (Неактивна) */}
            <div className="court-card-mini">
              <img src="https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=200&q=80" alt="Court" className="mini-img" />
              <div className="mini-info">
                <span className="court-type-badge badge-foot">Футбол</span>
                <div className="court-name">X-Park Arena</div>
                <div className="court-address">Парк Муромець</div>
                <div className="live-indicator">
                  <span className="dot free"></span>
                  Зараз: Вільне поле
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- B. Права частина (Карта) --- */}
        <div className="map-container">
          {/* Фейкові маркери, розставлені абсолютно на фоні-карті */}
          <div className="map-marker marker-basket">🏀</div>
          <div className="map-marker marker-foot">⚽</div>

          {/* --- C. Детальна панель вибраного майданчика (Overlay) --- */}
          {/* Ця панель з'являється поверх карти, коли вибрано майданчик */}
          <div className="court-detail-panel">
            <img src="https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=500&q=80" alt="Detail" className="detail-header-img" />
            
            <div className="detail-content">
              <h1>Поляна КПІ</h1>
              <p style={{color: 'var(--text-secondary)', marginBottom: '20px'}}>🏀 Вуличний баскетбол • Асфальт • Є освітлення</p>

              {/* ГОЛОВНА ФІШКА: Віджет часу і людей */}
              <div className="checkin-widget">
                <div className="widget-title">
                  <span>Планування гри</span>
                </div>

                {/* Статус на вибраний час */}
                <div className="status-bar-large">
                  <span className="dot busy" style={{marginRight: '10px'}}></span>
                  Сьогодні, 19:00 — Очікується 15 гравців 🔥
                </div>

                {/* Вибір часу (Тільки дизайн) */}
                <p style={{fontSize: '0.9rem', marginBottom: '10px', fontWeight: '600'}}>Обери свій час:</p>
                <div className="time-selector">
                  <div className="time-chip">17:00 (5 чол.)</div>
                  <div className="time-chip">18:00 (9 чол.)</div>
                  <div className="time-chip selected">19:00 (15 чол.)</div>
                  <div className="time-chip">20:00 (8 чол.)</div>
                </div>

                <button className="btn-checkin">Я буду грати о 19:00</button>
              </div>

              {/* Секція відгуків */}
              <div className="reviews-section">
                <h3>Відгуки (24)</h3>
                <div style={{marginTop: '15px'}}>
                  <div className="review-card">
                    <div className="review-header">
                      <span>Макс Данкер</span>
                      <span className="stars">★★★★★</span>
                    </div>
                    <p className="review-text">Кільця нові, сітки є. Але ввечері дуже багато людей, черга на гру.</p>
                  </div>
                  <div className="review-card">
                    <div className="review-header">
                      <span>Олексій</span>
                      <span className="stars">★★★☆☆</span>
                    </div>
                    <p className="review-text">Асфальт трохи кривий біля триочкової.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;