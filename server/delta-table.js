const table = require('text-table');

const sizes = ['parsed_size', 'gzip_size'];

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
	if (!d.firstSizes) {
		return '(new)';
	}

	if (!d.secondSizes) {
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

function trimName(name, chars) {
	if (name.length > chars) {
		return name.slice(0, chars - 3) + '...';
	}
	return name;
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
		['name', ...sizeHeaders],
	];

	for (const d of deltas) {
		const chunkColumns = [trimName(d.name, 80)];
		for (const size of sizes) {
			chunkColumns.push(addSignAndBytes(d.deltaSizes[size]));
			chunkColumns.push(getPercentText(d, size));
		}

		tableData.push(chunkColumns);
	}

	return table(tableData, { align: ['l', 'r', 'r', 'r', 'r'] });
}

module.exports = printDeltaTable;
