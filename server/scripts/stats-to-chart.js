const { writeFileSync } = require('fs');
const { readStatsFromFile, getViewerData } = require('webpack-bundle-analyzer/lib/analyzer');

function chartFromFile(filename) {
	const stats = readStatsFromFile(filename);
	const chart = getViewerData(stats, './public/evergreen');
	writeFileSync('client/chart.json', JSON.stringify(chart, null, 2));
}

chartFromFile('client/stats.json');
