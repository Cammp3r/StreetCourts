import { useMemo, useState } from 'react';
import {
  DEFAULT_TIME_SLOTS,
  getCourtBookingsCount,
  getRecommendedTimeSlots,
  getSlotBookingsCount,
  getUpcomingDays,
  registerToSlot,
} from '../utils/bookingStorage';

export function MiniCourtCalendar({ courtId, onRegister }) {
  const days = useMemo(() => getUpcomingDays(7), []);
  const [selectedDay, setSelectedDay] = useState(days[0]?.value || '');
  const [selectedTime, setSelectedTime] = useState(DEFAULT_TIME_SLOTS[0]);
  const [refreshTick, setRefreshTick] = useState(0);

  void refreshTick;

  const totalRegistered = getCourtBookingsCount(courtId);
  const selectedSlotCount = getSlotBookingsCount(courtId, selectedDay, selectedTime);
  const recommendedSlots = getRecommendedTimeSlots(courtId, selectedDay, 3);

  const handleRegister = () => {
    if (!selectedDay || !selectedTime) return;
    registerToSlot(courtId, selectedDay, selectedTime);
    setRefreshTick((current) => current + 1);
    if (onRegister) {
      onRegister({ courtId, selectedDay, selectedTime });
    } // зробити звук повідомлення коли натискаєш на кнопку
  };

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-header">
        <div className="mini-calendar-title">Міні-календар</div>
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
        {DEFAULT_TIME_SLOTS.map((timeSlot) => (
          <button
            key={timeSlot}
            type="button"
            className={`mini-time-btn ${selectedTime === timeSlot ? 'active' : ''}`}
            onClick={() => setSelectedTime(timeSlot)}
          >
            {timeSlot}
          </button>
        ))}
      </div>

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

      <div className="mini-calendar-footer">
        <div className="mini-slot-count">На цей час: {selectedSlotCount}</div>
        <button type="button" className="mini-register-btn" onClick={handleRegister}>
          Зареєструватися
        </button>
      </div>
    </div>
  );
}
