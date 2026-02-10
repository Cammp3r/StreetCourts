export function LastCheckinBanner({ activeUser, borderColor }) {
  return (
    <div
      style={{
        border: `2px solid ${borderColor}`,
        padding: '10px',
        borderRadius: '8px',
        transition: '0.5s',
      }}
    >
      <p style={{ color: '#aaa', fontSize: '12px' }}>Останній чекін:</p>
      <h3 style={{ margin: 0 }}>🏀 {activeUser}</h3>
    </div>
  );
}
