import React from 'react';
import table from 'text-table';

const sizes = ['stat_size', 'parsed_size', 'gzip_size'];

const addSignAndBytes = n => {
	const sign = n >= 0 ? '+' : '';
	return `${sign}${n} B`;
};

const formatPercent = p => {
	const sign = p >= 0 ? '+' : '';
	const withOneDecimal = p.toFixed(1);
	return `${sign}${withOneDecimal}%`;
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
	const sizeHeaders = [];
	for (const size of sizes) {
		// common header for the bytes and percent columns
		sizeHeaders.push(size);
		sizeHeaders.push('');
	}

	const tableData = [
		// header columns
		['chunk', ...sizeHeaders],
	];

	for (const d of delta) {
		const chunkColumns = [d.chunk];
		for (const size of sizes) {
			chunkColumns.push(addSignAndBytes(d.deltaSizes[size]));
			if (d.deltaPercents && d.deltaPercents[size]) {
				chunkColumns.push(`(${formatPercent(d.deltaPercents[size])})`);
			} else {
				chunkColumns.push('');
			}
		}
		chunkColumns.push(getSuffix(d));

		tableData.push(chunkColumns);
	}

	const tableText = table(tableData, { align: ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'l'] });

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
