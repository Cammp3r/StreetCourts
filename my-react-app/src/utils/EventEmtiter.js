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
		if (typeof handler !== 'function') return;

		handler(payload);
	}

	clear() {
		this.listeners.clear();
	}
}

export const eventEmitter = new EventEmitter();
