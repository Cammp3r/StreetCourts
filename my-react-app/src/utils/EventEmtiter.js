class EventEmitter {
	constructor() {
		this.listeners = new Map();
	}

	setListener(eventName, handler) {
		if (typeof handler !== 'function') return;

		this.listeners.set(eventName, handler);
	}

	clearListener(eventName) {
		this.listeners.delete(eventName);
	}

	emit(eventName, payload) {
		const handler = this.listeners.get(eventName);
		if (typeof handler === 'function') {
			handler(payload);
		}

		// Also emit to subscribers
		const subscribers = this.listeners.get(`__subscribers__${eventName}`);
		if (Array.isArray(subscribers)) {
			subscribers.forEach(handler => {
				if (typeof handler === 'function') {
					handler(payload);
				}
			});
		}
	}

	subscribe(eventName, handler) {
		if (typeof handler !== 'function') return null;

		const key = `__subscribers__${eventName}`;
		if (!this.listeners.has(key)) {
			this.listeners.set(key, []);
		}

		const subscribers = this.listeners.get(key);
		subscribers.push(handler);

		// Return unsubscribe function
		return () => this.unsubscribe(eventName, handler);
	}

	unsubscribe(eventName, handler) {
		const key = `__subscribers__${eventName}`;
		const subscribers = this.listeners.get(key);

		if (Array.isArray(subscribers)) {
			const index = subscribers.indexOf(handler);
			if (index > -1) {
				subscribers.splice(index, 1);
			}

			// Clean up empty subscriber arrays
			if (subscribers.length === 0) {
				this.listeners.delete(key);
			}
		}
	}

	clear() {
		this.listeners.clear();
	}
}

export const eventEmitter = new EventEmitter();
