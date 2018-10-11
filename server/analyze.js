const _ = require('lodash');

function analyzeBundle(sha, stats, chart) {
	const chunkStats = chart.map(asset => {
		const [chunk, hash] = asset.label.split('.');

		return {
			sha,
			chunk,
			hash,
			stat_size: asset.statSize,
			parsed_size: asset.parsedSize,
			gzip_size: asset.gzipSize,
		};
	});

	const webpackMajorVersion = parseInt(stats.version, 10);

	const chunkNames = _.fromPairs(_.map(stats.chunks, chunk => [chunk.id, chunk.names]));

	const getName = id => _.get(chunkNames, [ id, 0 ], id);

	let chunkGroups;
	if (webpackMajorVersion >= 4) {
		chunkGroups = _.flatMap(stats.chunks, chunk =>
			chunk.siblings.map(sibling => ({
				sha,
				chunk: getName(chunk.id),
				sibling: getName(sibling),
			}))
		);
	} else {
		// support for webpack < 4
		chunkGroups = [
			{ sha, chunk: 'build', sibling: 'manifest' },
			{ sha, chunk: 'build', sibling: 'vendor' },
		];
	}

	return { sha, chunkStats, chunkGroups, chunkNames };
}

module.exports = analyzeBundle;
