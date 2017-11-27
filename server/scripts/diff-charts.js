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

const sizes = [ 'stat_size', 'parsed_size', 'gzip_size' ];

function sizesOf(stat) {
	return stat ? sizes.map(size => stat[size]) : null;
}

function deltaFromFiles(filename1, filename2) {
	const chart1 = JSON.parse(readFileSync(filename1, 'utf-8'));
	const chart2 = JSON.parse(readFileSync(filename2, 'utf-8'));

	const firstStats = assetsFromChart(chart1);
	const secondStats = assetsFromChart(chart2);

	const deltas = [];
	for ( const firstStat of firstStats ) {
		const chunk = firstStat.chunk;
		const firstHash = firstStat.hash;
		const secondStat = secondStats.find(s => s.chunk === chunk);
		const secondHash = secondStat ? secondStat.hash : null;

		if (firstHash !== secondHash) {
			deltas.push({ chunk, firstSizes: sizesOf(firstStat), secondSizes: sizesOf(secondStat) });
		}
	}

	for ( const secondStat of secondStats ) {
		if (!firstStats.find(s => s.chunk === secondStat.chunk)) {
			deltas.push({ chunk: stat.chunk, firstSizes: null, secondSize: sizesOf(secondStat) });
		}
	}

	return deltas;
}

const delta = deltaFromFiles('chart1.json', 'chart2.json', 'gzip_size');
let totalDeltas = [ 0, 0, 0 ];
for (d of delta) {
	const deltas = sizes.map((size, i) => {
		const sizeDelta = d.secondSizes[i] - d.firstSizes[i];
		totalDeltas[i] += sizeDelta;
		return sizeDelta;
	});
	console.log(`${d.chunk}: parsed_size: ${deltas[1]} gzip_size: ${deltas[2]}`);
}
console.log(`Total: parsed_size: ${totalDeltas[1]} gzip_size: ${totalDeltas[2]}`);
