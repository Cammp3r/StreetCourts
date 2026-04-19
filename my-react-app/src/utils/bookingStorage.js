const BOOKINGS_STORAGE_KEY = 'streetcourts-bookings-v1';

export const DEFAULT_TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

function safeParse(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getUpcomingDays(count = 7) {
  const days = [];
  const now = new Date();

  for (let index = 0; index < count; index += 1) {
    const nextDay = new Date(now);
    nextDay.setDate(now.getDate() + index);

    days.push({
      value: nextDay.toISOString().slice(0, 10),
      dayLabel: nextDay.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }),
      weekdayLabel: nextDay.toLocaleDateString('uk-UA', { weekday: 'short' }),
    });
  }

  return days;
}

export function getAllBookings() {
  if (typeof window === 'undefined') return {};
  return safeParse(window.localStorage.getItem(BOOKINGS_STORAGE_KEY));
}

export function getCourtBookings(courtId) {
  const allBookings = getAllBookings();
  return allBookings[courtId] || {};
}

export function getCourtBookingsCount(courtId) {
  const courtBookings = getCourtBookings(courtId);

  return Object.values(courtBookings).reduce((total, dayBookings) => {
    if (!dayBookings || typeof dayBookings !== 'object') return total;
    const dayTotal = Object.values(dayBookings).reduce((sum, slotCount) => {
      const numericCount = Number(slotCount) || 0;
      return sum + numericCount;
    }, 0);
    return total + dayTotal;
  }, 0);
}

export function getSlotBookingsCount(courtId, day, timeSlot) {
  const courtBookings = getCourtBookings(courtId);
  return Number(courtBookings?.[day]?.[timeSlot]) || 0;
}

export function registerToSlot(courtId, day, timeSlot) {
  if (typeof window === 'undefined') return 0;

  const allBookings = getAllBookings();
  const currentCourt = allBookings[courtId] || {};
  const currentDay = currentCourt[day] || {};
  const currentCount = Number(currentDay[timeSlot]) || 0;
  const nextCount = currentCount + 1;

  const nextBookings = {
    ...allBookings,
    [courtId]: {
      ...currentCourt,
      [day]: {
        ...currentDay,
        [timeSlot]: nextCount,
      },
    },
  };

  window.localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(nextBookings));
  return nextCount;
}
