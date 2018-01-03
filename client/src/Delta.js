import React from 'react';
import table from 'text-table';

const sizes = ['stat_size', 'parsed_size', 'gzip_size'];

const addSignAndUnit = n => {
	const sign = n >= 0 ? '+' : '';
	return `${sign}${n} B`;
};

const getSuffix = d => {
	if (!d.firstHash) {
		return '(new chunk)';
	} else if (!d.secondHash) {
		return '(deleted chunk)';
	}
	return '';
};

const DeltaTable = ({ delta }) => {
	const tableData = [
		// header columns
		['chunk', ...sizes],
	];

	for (const d of delta) {
		tableData.push([
			d.chunk,
			...sizes.map(size => addSignAndUnit(d.deltaSizes[size])),
			getSuffix(d),
		]);
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
