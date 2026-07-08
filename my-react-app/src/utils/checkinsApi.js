const API_BASE = '/api';

export const DEFAULT_TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

function toLocalDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getUpcomingDays(count = 7) {
  const days = [];
  const now = new Date();

  for (let index = 0; index < count; index += 1) {
    const nextDay = new Date(now);
    nextDay.setDate(now.getDate() + index);

    // Local date components, not toISOString() (UTC) — otherwise "today" can
    // shift by a day in timezones ahead of UTC, making every slot look past.
    days.push({
      value: toLocalDateValue(nextDay),
      dayLabel: nextDay.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }),
      weekdayLabel: nextDay.toLocaleDateString('uk-UA', { weekday: 'short' }),
    });
  }

  return days;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}

export function isSlotInFuture(day, timeSlot) {
  if (!day || !timeSlot) return false;
  const slotDate = new Date(`${day}T${timeSlot}:00`);
  return !Number.isNaN(slotDate.getTime()) && slotDate >= new Date();
}

export async function fetchAllCheckins({ signal } = {}) {
  const response = await fetch(`${API_BASE}/checkins`, { signal });
  if (!response.ok) throw new Error('Не вдалося завантажити реєстрації');
  const data = await readJson(response);
  return Array.isArray(data?.checkins) ? data.checkins : [];
}

export async function fetchCourtCheckins(courtId, { signal } = {}) {
  if (!courtId) return [];
  const response = await fetch(`${API_BASE}/courts/${encodeURIComponent(courtId)}/checkins`, { signal });
  if (!response.ok) throw new Error('Не вдалося завантажити реєстрації площадки');
  const data = await readJson(response);
  return Array.isArray(data?.checkins) ? data.checkins : [];
}

export async function createCheckin(courtId, { userName, day, timeSlot }) {
  const response = await fetch(`${API_BASE}/courts/${encodeURIComponent(courtId)}/checkins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName, day, timeSlot }),
  });

  if (!response.ok) {
    const error = await readJson(response).catch(() => null);
    throw new Error(error?.error || 'Не вдалося зареєструватися');
  }

  return readJson(response);
}

export function getRecommendedTimeSlots(checkins, day, limit = 3) {
  if (!day) return [];

  return DEFAULT_TIME_SLOTS
    .filter((timeSlot) => isSlotInFuture(day, timeSlot))
    .map((timeSlot) => {
      const currentCount = checkins.filter((item) => item.day === day && item.timeSlot === timeSlot).length;

      const hour = Number(timeSlot.split(':')[0]) || 0;
      let timePreference = 1;
      if (hour >= 18) timePreference = 8;
      else if (hour >= 14) timePreference = 5;
      else if (hour >= 10) timePreference = 3;

      return {
        timeSlot,
        currentCount,
        priority: 100 + timePreference + currentCount * 14,
      };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}
