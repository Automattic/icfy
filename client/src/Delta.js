import React from 'react';

const Delta = ({ delta }) => {
	let content;
	if (!delta) {
		content = '...';
	} else if (delta.length === 0) {
		content = 'no changes in production JS';
	} else {
		content = delta.map(d => {
			let diff,
				suffix = '';
			if (!d.firstSize) {
				diff = d.secondSize;
				suffix = '(new chunk)';
			} else if (!d.secondSize) {
				diff = -d.firstSize;
				suffix = '(deleted chunk)';
			} else {
				diff = d.secondSize - d.firstSize;
			}
			const diffText = diff >= 0 ? `+${diff} bytes` : `${diff} bytes`;
			const text = `${diffText} ${d.firstHash} -> ${d.secondHash} ${suffix}`;
			return (
				<span key={d.chunk}>
					{d.chunk}: {text}
					<br />
				</span>
			);
		});
	}

	return (
		<p className="push">
			<b>Delta:</b>
			<br />
			{content}
		</p>
	);
};

export default Delta;
