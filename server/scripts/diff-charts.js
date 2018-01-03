const _ = require('lodash');
const { get } = require('axios');
const { readFileSync } = require('fs');
const { readStatsFromFile, getViewerData } = require('webpack-bundle-analyzer/lib/analyzer');
const table = require('text-table');
const { deltaFromStats } = require('../delta.js');

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

const addSign = n => {
	const sign = n > 0 ? '+' : '';
	return `${sign}${n}`;
};

const printDeltas = deltas => {
	const signedValues = _.mapValues(deltas, addSign);
	return sizes.map(size => signedValues[size]);
};

function formatDeltaAsTable(delta) {
	const tableData = [
		// header columns
		['chunk', ...sizes, 'old_hash', 'new_hash'],
	];

	const totalDeltas = _.fromPairs(sizes.map(size => [size, 0]));
	for (d of delta) {
		sizes.forEach(size => (totalDeltas[size] += d.deltaSizes[size]));
		tableData.push([d.chunk, ...printDeltas(d.deltaSizes), d.firstHash, d.secondHash]);
	}
	tableData.push(['Total', ...printDeltas(totalDeltas)]);

	return table(tableData, { align: ['l', 'r', 'r', 'r'] });
}

const firstSlug = process.argv[2];
const secondSlug = process.argv[3];

Promise.all([statsFrom(firstSlug), statsFrom(secondSlug)])
	.then(([firstStats, secondStats]) => {
		const delta = deltaFromStats(firstStats, secondStats);
		const deltaTable = formatDeltaAsTable(delta);
		console.log(deltaTable);
	})
	.catch(console.error);
