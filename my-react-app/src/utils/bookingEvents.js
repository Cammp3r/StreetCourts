class BookingObservable {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Booking listener must be a function');
    }

    this.listeners.add(listener);

    return () => {
      this.unsubscribe(listener);
    };
  }

  unsubscribe(listener) {
    this.listeners.delete(listener);
  }

  publish(message) {
    this.listeners.forEach((listener) => {
      listener(message);
    });
  }

  clear() {
    this.listeners.clear();
  }
}

export const bookingEvents = new BookingObservable();

