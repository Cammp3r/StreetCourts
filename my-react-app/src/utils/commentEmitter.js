class CommentEmitter {
	constructor() {
		this.listeners = new Set();
	}

	subscribe(handler) {
		if (typeof handler !== 'function') return () => {};

		this.listeners.add(handler);

		return () => {
			this.unsubscribe(handler);
		};
	}

	unsubscribe(handler) {
		this.listeners.delete(handler);
	}

	emit(payload) {
		this.listeners.forEach((handler) => {
			handler(payload);
		});
	}

	clear() {
		this.listeners.clear();
	}
}

export const commentEmitter = new CommentEmitter();