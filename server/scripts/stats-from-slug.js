const { get } = require('axios');
const { readFileSync } = require('fs');

const apiURL = 'http://api.iscalypsofastyet.com:5000';

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

function statsFromSlug(slug) {
	if (slug.startsWith('sha:')) {
		return statsFromAPI(slug.slice(4));
	} else if (slug.startsWith('file:')) {
		return Promise.resolve(statsFromChartFile(slug.slice(5)));
	}

	throw new Error('Invalid input argument:', slug);
}

exports.statsFromSlug = statsFromSlug;
