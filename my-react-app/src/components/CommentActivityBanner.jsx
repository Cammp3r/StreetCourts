import { useEffect, useState } from 'react';
import { commentEmitter } from '../utils/commentEmitter';

export function CommentActivityBanner({ courtId }) {
	const [latestComment, setLatestComment] = useState(null);

	useEffect(() => {
		if (!courtId) return undefined;

		const unsubscribe = commentEmitter.subscribe((payload) => {
			if (payload?.courtId !== courtId) return;
			setLatestComment({
				author: payload.comment?.author || 'Анонім',
				text: payload.comment?.text || '',
				message: payload.message || 'Коментар успішно надіслано',
			});
		});

		return unsubscribe;
	}, [courtId]);

	if (!latestComment) return null;

	return (
		<div
			style={{
				padding: '12px 14px',
				borderRadius: '12px',
				background: 'var(--bg-secondary)',
				border: '1px solid var(--border-color, rgba(0,0,0,0.08))',
				marginBottom: '12px',
			}}
		>
			<div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{latestComment.message}</div>
			<div style={{ fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
				{latestComment.author}
			</div>
			<div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
				{latestComment.text}
			</div>
		</div>
	);
}