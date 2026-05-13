import { MaxPriorityQueue } from './maxPriorityQueue';

const BOOKINGS_STORAGE_KEY = 'streetcourts-bookings-v1';

export const DEFAULT_TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

function parseSlotDate(day, timeSlot) {
  if (!day || !timeSlot) return null;

  const slotDate = new Date(`${day}T${timeSlot}:00`);
  return Number.isNaN(slotDate.getTime()) ? null : slotDate;
}

function isSlotInFuture(day, timeSlot, now = new Date()) {
  const slotDate = parseSlotDate(day, timeSlot);
  if (!slotDate) return false;
  return slotDate >= now;
}

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

function pruneExpiredBookings(allBookings = getAllBookings()) {
  if (typeof window === 'undefined') return allBookings;

  const now = new Date();
  let changed = false;
  const nextBookings = {};

  Object.entries(allBookings || {}).forEach(([courtId, courtBookings]) => {
    if (!courtBookings || typeof courtBookings !== 'object') return;

    const nextCourtBookings = {};

    Object.entries(courtBookings).forEach(([day, dayBookings]) => {
      if (!dayBookings || typeof dayBookings !== 'object') return;

      const nextDayBookings = {};

      Object.entries(dayBookings).forEach(([timeSlot, slotCount]) => {
        const numericCount = Number(slotCount) || 0;
        if (numericCount <= 0) return;
        if (!isSlotInFuture(day, timeSlot, now)) {
          changed = true;
          return;
        }

        nextDayBookings[timeSlot] = numericCount;
      });

      if (Object.keys(nextDayBookings).length > 0) {
        nextCourtBookings[day] = nextDayBookings;
      } else if (Object.keys(dayBookings).length > 0) {
        changed = true;
      }
    });

    if (Object.keys(nextCourtBookings).length > 0) {
      nextBookings[courtId] = nextCourtBookings;
    } else if (Object.keys(courtBookings).length > 0) {
      changed = true;
    }
  });

  if (changed) {
    window.localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(nextBookings));
  }

  return nextBookings;
}

export function getCourtBookings(courtId) {
  const allBookings = pruneExpiredBookings(getAllBookings());
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
  if (!isSlotInFuture(day, timeSlot)) return 0;
  const courtBookings = getCourtBookings(courtId);
  return Number(courtBookings?.[day]?.[timeSlot]) || 0;
}

export function registerToSlot(courtId, day, timeSlot) {
  if (typeof window === 'undefined') return 0;
  if (!isSlotInFuture(day, timeSlot)) return 0;

  const allBookings = pruneExpiredBookings(getAllBookings());
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

export function getRecommendedTimeSlots(courtId, day, limit = 3) {
  if (!courtId || !day) return [];

  const queue = new MaxPriorityQueue();

  DEFAULT_TIME_SLOTS.forEach((timeSlot) => {
    if (!isSlotInFuture(day, timeSlot)) return;

    const currentCount = getSlotBookingsCount(courtId, day, timeSlot);
    const hour = Number(timeSlot.split(':')[0]) || 0;

    let timePreference = 0;
    if (hour >= 18) timePreference = 8;
    else if (hour >= 14) timePreference = 5;
    else if (hour >= 10) timePreference = 3;
    else timePreference = 1;

    const loadBoost = currentCount * 14;
    const priority = 100 + timePreference + loadBoost;

    queue.enqueue({ timeSlot, currentCount }, priority);
  });

  const result = [];
  while (queue.size() > 0 && result.length < limit) {
    const next = queue.dequeue();
    if (next) result.push(next);
  }

  return result;
}
