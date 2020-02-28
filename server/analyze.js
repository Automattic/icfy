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

	const chunkNames = _.fromPairs(_.map(stats.chunks, chunk => [chunk.id, chunk.names]));

	const getName = id => _.get(chunkNames, [id, 0], id);

	const chunkGroups = _.flatMap(stats.namedChunkGroups, ({ chunks }, groupName) =>
		chunks.map(chunk => ({
			sha,
			chunk: groupName,
			sibling: getName(chunk),
		}))
	);

	return { sha, chunkStats, chunkGroups, chunkNames };
}

module.exports = analyzeBundle;
