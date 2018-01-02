import React from 'react';
import table from 'text-table';

const DeltaTable = ({ size, delta }) => {
	const tableData = [
		// header columns
		['chunk', size, 'old_hash', 'new_hash'],
	];

	for (const d of delta) {
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
		tableData.push([d.chunk, diffText, d.firstHash || '', d.secondHash || '', suffix]);
	}

	const tableText = table(tableData, { align: ['l', 'r', 'r', 'r'] });

	return <div className="text-table">{tableText}</div>;
};

const Delta = ({ size, delta }) => {
	let content;
	if (!delta) {
		content = 'building...';
	} else if (delta.length === 0) {
		content = 'no changes in production JS';
	} else {
		content = <DeltaTable size={size} delta={delta} />;
	}

	return (
		<div className="push">
			<b>Delta:</b>
			<br />
			{content}
		</div>
	);
};

export default Delta;
