import React from 'react';

const CommitLink = ({ sha }) => (
	<a href={`https://github.com/Automattic/wp-calypso/commit/${sha}`}>{sha}</a>
);

const CommitMessage = ({ message }) => {
	const children = [];
	const re = /#(\d+)/g;
	let i = 0,
		match;
	while ((match = re.exec(message))) {
		children.push(
			message.substr(i, match.index - i),
			<a href={`https://github.com/Automattic/wp-calypso/pull/${match[1]}`}>{match[0]}</a>
		);
		i = match.index + match[0].length;
	}
	children.push(message.substr(i));

	return <span>{children}</span>;
};

const Push = ({ push }) => (
	<div>
		<b>Author:</b> {push ? push.author : '...'}
		<br />
		<b>At:</b> {push ? push.created_at : '...'}
		<br />
		<b>Message:</b> {push ? <CommitMessage message={push.message} /> : '...'}
	</div>
);

const Delta = ({ delta }) => {
	let content;
	if (!delta) {
		content = '...';
	} else if (delta.length === 0) {
		content = 'no changes in production JS';
	} else {
		content = delta.map(d => {
			let text;
			if (!d.firstSize) {
				text = 'new chunk';
			} else if (!d.secondSize) {
				text = 'deleted chunk';
			} else {
				const diff = d.secondSize - d.firstSize;
				text = diff > 0 ? `+${diff} bytes` : `${diff} bytes`;
			}
			return (
				<span>
					{d.chunk}: {text}
					<br />
				</span>
			);
		});
	}

	return [<b>Delta:</b>, <br />, content];
};

const PushDetails = ({ sha, push, delta }) => {
	if (!sha) {
		return null;
	}

	return (
		<div className="push">
			<b>Commit:</b> <CommitLink sha={sha} />
			<br />
			<Push push={push} />
			<Delta delta={delta} />
		</div>
	);
};

export default PushDetails;
