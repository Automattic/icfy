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

function filterTinyChanges(deltas) {
	return deltas.filter((delta, i) => i < 10 || Math.abs(delta.deltaSizes.parsed_size) > 10);
}

function printDeltaTable(deltas, options = {}) {
	const { hideTinyChanges = true, printTotal = false, printTinyChangesNotice = false } = options;

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

	const relevantDeltas = hideTinyChanges ? filterTinyChanges(deltas) : deltas;

	for (const d of relevantDeltas) {
		const chunkColumns = [trimName(d.name, 80)];
		for (const size of sizes) {
			chunkColumns.push(addSignAndBytes(d.deltaSizes[size]));
			chunkColumns.push(getPercentText(d, size));
		}

		tableData.push(chunkColumns);
	}

	if (printTotal) {
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
	}

	const hiddenDeltas = deltas.length - relevantDeltas.length;
	if (printTinyChangesNotice && hiddenDeltas > 0) {
		tableData.push([]);
		tableData.push([`(${hiddenDeltas} rows with tiny changes were hidden)`]);
	}

	return table(tableData, { align: ['l', 'r', 'r', 'r', 'r', 'r', 'r'] });
}

export default printDeltaTable;
