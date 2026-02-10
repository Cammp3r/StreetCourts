import { CourtCardMini } from './CourtCardMini';

export function Sidebar({ courts }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Знайди гру поруч</h2>
        <div className="filters">
          <button className="filter-btn active-basketball">🏀 Баскетбол</button>
          <button className="filter-btn active-football">⚽ Футбол</button>
          <button className="filter-btn">🏐 Волей</button>
        </div>
      </div>

      <div className="courts-list">
        {courts.map((court) => (
          <CourtCardMini key={court.id} court={court} />
        ))}
      </div>
    </div>
  );
}
