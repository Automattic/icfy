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

const getPercentText = (d, size) => {
	if (!d.firstHash) {
		return '(new)';
	}

	if (!d.secondHash) {
		return '(deleted)';
	}

	if (d.deltaPercents && d.deltaPercents[size]) {
		return `(${formatPercent(d.deltaPercents[size])})`;
	}

	return '';
};

function getTotalDelta(deltas) {
	let result = {};

	for (const d of deltas) {
		for (const size of sizes) {
			result[size] = (result[size] || 0) + d.deltaSizes[size];
		}
	}

	return result;
}

function printDeltaTable(deltas) {
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

	for (const d of deltas) {
		const chunkColumns = [d.chunk];
		for (const size of sizes) {
			chunkColumns.push(addSignAndBytes(d.deltaSizes[size]));
			chunkColumns.push(getPercentText(d, size));
		}

		tableData.push(chunkColumns);
	}

	const totals = getTotalDelta(deltas);
	const totalColumns = ['Total'];
	for (const size of sizes) {
		totalColumns.push(addSignAndBytes(totals[size]));
		totalColumns.push('');
	}

	// Empty row.
	tableData.push([]);
	// Totals row.
	tableData.push(totalColumns);

	return table(tableData, { align: ['l', 'r', 'r', 'r', 'r', 'r', 'r'] });
}

const Delta = ({ delta }) => {
	let content;
	if (!delta) {
		content = '...';
	} else if (delta.length === 0) {
		content = 'no changes in production JS';
	} else {
		content = <div className="text-table">{printDeltaTable(delta)}</div>;
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
