const { get } = require('axios');
const { readFileSync } = require('fs');
const { readStatsFromFile, getViewerData } = require('webpack-bundle-analyzer/lib/analyzer');
const table = require('text-table');

const apiURL = 'http://localhost:5000';

function statsFromAPI(sha) {
	return get(`${apiURL}/pushstats?sha=${sha}`).then(response => response.data.stats);
}

function statsFromChartFile(chartFileName) {
	const chartData = JSON.parse(readFileSync(chartFileName, 'utf-8'));

	return chartData.map(asset => {
		const [chunk, hash] = asset.label.split('.');

		return {
			chunk,
			hash,
			stat_size: asset.statSize,
			parsed_size: asset.parsedSize,
			gzip_size: asset.gzipSize,
		};
	});
}

function statsFrom(slug) {
	if (slug.startsWith('sha:')) {
		return statsFromAPI(slug.slice(4));
	} else if (slug.startsWith('file:')) {
		return Promise.resolve(statsFromChartFile(slug.slice(5)));
	}

	throw new Error('Invalid input argument:', slug);
}

const sizes = ['stat_size', 'parsed_size', 'gzip_size'];

function sizesOf(stat) {
	return stat ? sizes.map(size => stat[size]) : null;
}

function deltaSizesOf(firstSizes, secondSizes) {
	if (!firstSizes) {
		// new chunk, the delta is the full size of the second version
		return secondSizes;
	}

	if (!secondSizes) {
		// deleted chunk, the delta is the negative full size of the first version
		return secondSizes.map(size => -size);
	}

	return firstSizes.map((firstSize, i) => secondSizes[i] - firstSize);
}

const printDeltas = deltas =>
	deltas.map(delta => {
		const sign = delta > 0 ? '+' : '';
		return `${sign}${delta}`;
	});

function deltaFromStats(firstStats, secondStats) {
	const deltas = [];

	for (const firstStat of firstStats) {
		const chunk = firstStat.chunk;
		const firstHash = firstStat.hash;
		const secondStat = secondStats.find(s => s.chunk === chunk);
		const secondHash = secondStat ? secondStat.hash : null;

		if (firstHash !== secondHash) {
			const firstSizes = sizesOf(firstStat);
			const secondSizes = sizesOf(secondStat);
			const deltaSizes = deltaSizesOf(firstSizes, secondSizes);

			deltas.push({
				chunk,
				firstHash,
				firstSizes,
				secondHash,
				secondSizes,
				deltaSizes,
			});
		}
	}

	for (const secondStat of secondStats) {
		if (!firstStats.find(s => s.chunk === secondStat.chunk)) {
			const firstSizes = null;
			const secondSizes = sizesOf(secondStat);
			const deltaSizes = deltaSizesOf(firstSizes, secondSizes);

			deltas.push({
				chunk: secondStat.chunk,
				firstHash: null,
				firstSizes,
				secondHash: secondStat.hash,
				secondSizes,
				deltaSizes,
			});
		}
	}

	return deltas;
}

function formatDeltaAsTable(delta) {
	const tableData = [
		// header columns
		['chunk', ...sizes, 'old_hash', 'new_hash'],
	];

	const totalDeltas = [0, 0, 0];
	for (d of delta) {
		d.deltaSizes.forEach((deltaSize, i) => (totalDeltas[i] += deltaSize));
		tableData.push([d.chunk, ...printDeltas(d.deltaSizes), d.firstHash, d.secondHash]);
	}
	tableData.push(['Total', ...printDeltas(totalDeltas)]);

	return table(tableData, { align: ['l', 'r', 'r', 'r'] });
}

const firstSlug = process.argv[2];
const secondSlug = process.argv[3];
console.log('args:', firstSlug, secondSlug);

Promise.all([statsFrom(firstSlug), statsFrom(secondSlug)])
	.then(([firstStats, secondStats]) => {
		console.log('fs:', firstStats);
		const delta = deltaFromStats(firstStats, secondStats);
		const deltaTable = formatDeltaAsTable(delta);
		console.log(deltaTable);
	})
	.catch(console.error);
