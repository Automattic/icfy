const { readFileSync } = require('fs');
const { readStatsFromFile, getViewerData } = require('webpack-bundle-analyzer/lib/analyzer');

function assetsFromChart(chart) {
	return chart.map(asset => {
		const [ chunk, hash ] = asset.label.split('.');

		return {
			chunk,
			hash,
			stat_size: asset.statSize,
			parsed_size: asset.parsedSize,
			gzip_size: asset.gzipSize
		};
	});
}

function deltaFromFiles(filename1, filename2, size) {
	const chart1 = JSON.parse(readFileSync(filename1, 'utf-8'));
	const chart2 = JSON.parse(readFileSync(filename2, 'utf-8'));

	const firstStats = assetsFromChart(chart1);
	const secondStats = assetsFromChart(chart2);

	const deltas = [];
	for ( const stat of firstStats ) {
		const chunk = stat.chunk;
		const firstSize = stat[size];
		const secondStat = secondStats.find(s => s.chunk === chunk);
		const secondSize = secondStat ? secondStat[size] : null;

		if (firstSize !== secondSize) {
			deltas.push({ chunk, firstSize, secondSize });
		}
	}

	for ( const stat of secondStats ) {
		if (!firstStats.find(s => s.chunk === stat.chunk)) {
			deltas.push({ chunk: stat.chunk, firstSize: null, secondSize: stat[size] });
		}
	}

	return deltas;
}

const delta = deltaFromFiles('chart1.json', 'chart2.json', 'gzip_size');
let totalDelta = 0;
for (d of delta) {
	const sizeDelta = d.secondSize - d.firstSize;
	totalDelta += sizeDelta;
	console.log(`${d.chunk}: ${sizeDelta}`);
}
console.log(`Total: ${totalDelta}`);
