import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_TIME_SLOTS,
  createCheckin,
  fetchCourtCheckins,
  getRecommendedTimeSlots,
  getUpcomingDays,
  isSlotInFuture,
} from '../utils/checkinsApi';

const GUEST_NAME_STORAGE_KEY = 'sc_checkin_name';

export function MiniCourtCalendar({ courtId, userName }) {
  const days = useMemo(() => getUpcomingDays(7), []);
  const [selectedDay, setSelectedDay] = useState(days[0]?.value || '');
  const [selectedTime, setSelectedTime] = useState('');
  const [checkins, setCheckins] = useState([]);
  const [guestName, setGuestName] = useState(
    () => (typeof window !== 'undefined' && window.localStorage.getItem(GUEST_NAME_STORAGE_KEY)) || ''
  );
  const [statusMessage, setStatusMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const activeName = userName || guestName;

  useEffect(() => {
    if (!courtId) return undefined;

    const controller = new AbortController();

    fetchCourtCheckins(courtId, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setCheckins(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) console.error('Failed to load check-ins:', error);
      });

    return () => controller.abort();
  }, [courtId]);

  const totalRegistered = checkins.length;

  const availableTimeSlots = useMemo(
    () => DEFAULT_TIME_SLOTS.filter((timeSlot) => isSlotInFuture(selectedDay, timeSlot)),
    [selectedDay]
  );

  useEffect(() => {
    if (availableTimeSlots.includes(selectedTime)) return;
    setSelectedTime(availableTimeSlots[0] || '');
  }, [availableTimeSlots, selectedTime]);

  const namesForSelectedSlot = useMemo(
    () => checkins.filter((item) => item.day === selectedDay && item.timeSlot === selectedTime).map((item) => item.userName),
    [checkins, selectedDay, selectedTime]
  );

  const recommendedSlots = useMemo(
    () => getRecommendedTimeSlots(checkins, selectedDay, 3),
    [checkins, selectedDay]
  );

  const handleRegister = async () => {
    const trimmedName = activeName.trim();
    if (!trimmedName || !selectedDay || !selectedTime || isRegistering) return;

    if (!userName) {
      window.localStorage.setItem(GUEST_NAME_STORAGE_KEY, trimmedName);
      setGuestName(trimmedName);
    }

    setIsRegistering(true);
    try {
      const data = await createCheckin(courtId, {
        userName: trimmedName,
        day: selectedDay,
        timeSlot: selectedTime,
      });

      setCheckins(data?.checkins || []);
      setStatusMessage('Ви зареєстровані на гру');
      window.setTimeout(() => setStatusMessage(''), 2500);
    } catch (error) {
      setStatusMessage(error.message || 'Не вдалося зареєструватися');
      window.setTimeout(() => setStatusMessage(''), 2500);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-header">
        <div className="mini-calendar-title">Реєстрація на гру</div>
        <div className="mini-calendar-total">Зареєстровано: {totalRegistered}</div>
      </div>

      <div className="mini-calendar-days">
        {days.map((day) => (
          <button
            key={day.value}
            type="button"
            className={`mini-day-btn ${selectedDay === day.value ? 'active' : ''}`}
            onClick={() => setSelectedDay(day.value)}
          >
            <span>{day.dayLabel}</span>
            <span>{day.weekdayLabel}</span>
          </button>
        ))}
      </div>

      <div className="mini-calendar-times">
        {availableTimeSlots.length > 0 ? (
          availableTimeSlots.map((timeSlot) => (
            <button
              key={timeSlot}
              type="button"
              className={`mini-time-btn ${selectedTime === timeSlot ? 'active' : ''}`}
              onClick={() => setSelectedTime(timeSlot)}
            >
              {timeSlot}
            </button>
          ))
        ) : (
          <span className="mini-slot-count">На цей день час вже минув, оберіть інший день</span>
        )}
      </div>

      {recommendedSlots.length > 0 && (
        <div className="mini-recommended-wrap">
          <div className="mini-recommended-title">Рекомендовані слоти:</div>
          <div className="mini-recommended-list">
            {recommendedSlots.map((slot) => (
              <button
                key={slot.timeSlot}
                type="button"
                className={`mini-recommended-chip ${selectedTime === slot.timeSlot ? 'active' : ''}`}
                onClick={() => setSelectedTime(slot.timeSlot)}
              >
                {slot.timeSlot} ({slot.currentCount})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mini-calendar-footer">
        <div className="mini-slot-count">
          На цей час: {namesForSelectedSlot.length}
          {namesForSelectedSlot.length > 0 && (
            <span className="mini-slot-names"> — {namesForSelectedSlot.join(', ')}</span>
          )}
        </div>

        {!userName && (
          <input
            type="text"
            className="mini-guest-name-input"
            placeholder="Ваше ім'я"
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
          />
        )}

        <button
          type="button"
          className="mini-register-btn"
          onClick={handleRegister}
          disabled={isRegistering || !activeName.trim() || !selectedTime}
        >
          {isRegistering ? 'Реєстрація...' : 'Зареєструватися'}
        </button>

        {statusMessage && <div className="mini-status-message">{statusMessage}</div>}
      </div>
    </div>
  );
}
