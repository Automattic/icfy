const table = require('text-table');

const sizes = ['stat_size', 'parsed_size', 'gzip_size'];

const ZERO_SIZES = sizes.reduce((rv, size) => {
	rv[size] = 0;
	return rv;
}, {});

const sumDeltaSizes = deltas =>
	deltas.reduce((totalDeltas, delta) => {
		sizes.forEach(size => (totalDeltas[size] += delta.deltaSizes[size]));
		return totalDeltas;
	}, ZERO_SIZES);

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

	return table(tableData, { align: ['l', 'r', 'r', 'r', 'r', 'r', 'r'] });
}

function printPushStatsTable(pushStats) {
	const tableData = [['chunk', ...sizes]];
	for (const stat of pushStats) {
		tableData.push([stat.chunk, ...sizes.map(size => stat[size])]);
	}

	return table(tableData, { align: ['l', 'r', 'r', 'r'] });
}

exports.printDeltaTable = printDeltaTable;
exports.printPushStatsTable = printPushStatsTable;
