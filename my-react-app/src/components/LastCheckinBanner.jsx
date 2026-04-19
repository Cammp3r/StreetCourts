export function LastCheckinBanner({ activeUser, borderColor }) {
  return (
    <div
      style={{
        border: `2px solid ${borderColor}`,
        padding: '10px',
        borderRadius: '8px',
        transition: '0.5s',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Останній чекін:</p>
      <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>🏀 {activeUser}</h3>
    </div>
  );
}
