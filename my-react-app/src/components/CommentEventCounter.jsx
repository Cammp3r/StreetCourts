import { useEffect, useState } from 'react';
import { commentEmitter } from '../utils/commentEmitter';

export function CommentEventCounter({ courtId }) {
	const [commentEvents, setCommentEvents] = useState(0);

	useEffect(() => {
		if (!courtId) return undefined;

		const unsubscribe = commentEmitter.subscribe((payload) => {
			if (payload?.courtId !== courtId) return;
			setCommentEvents((current) => current + 1);
		});

		return unsubscribe;
	}, [courtId]);

	return (
		<div
			style={{
				fontSize: '12px',
				padding: '8px 12px',
				borderRadius: '999px',
				background: 'var(--bg-tertiary, rgba(0,0,0,0.04))',
				color: 'var(--text-secondary)',
				width: 'fit-content',
				marginBottom: '12px',
			}}
		>
			Коментарів у сесії: {commentEvents}
		</div>
	);
}