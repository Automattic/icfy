import React from 'react';
import CommitMessage from './CommitMessage';
import FormatDate from './FormatDate';

export default ({ push }) => (
	<div>
		<b>Author:</b> {push ? push.author : '...'}
		<br />
		<b>At:</b> {push ? <FormatDate date={push.created_at} /> : '...'}
		<br />
		<b>Message:</b> {push ? <CommitMessage message={push.message} /> : '...'}
	</div>
);
