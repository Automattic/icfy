const _ = require('lodash');

const sizes = ['stat_size', 'parsed_size', 'gzip_size'];

function sizesOf(stat) {
	return stat ? _.pick(stat, sizes) : null;
}

function deltaSizesOf(firstSizes, secondSizes) {
	if (!firstSizes) {
		// new chunk, the delta is the full size of the second version
		return secondSizes;
	}

	if (!secondSizes) {
		// deleted chunk, the delta is the negative full size of the first version
		return _.mapValues(secondSizes, size => -size);
	}

	return _.mapValues(firstSizes, (firstSize, type) => secondSizes[type] - firstSize);
}

function deltaPercentsOf(firstSizes, deltaSizes) {
	if (!firstSizes) {
		// new chunk, percent change has no meaning
		return null;
	}

	return _.mapValues(firstSizes, (firstSize, type) => {
		if (!firstSize) {
			return null;
		}

		return deltaSizes[type] / firstSize * 100;
	});
}

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
			const deltaPercents = deltaPercentsOf(firstSizes, deltaSizes);

			deltas.push({
				chunk,
				firstHash,
				firstSizes,
				secondHash,
				secondSizes,
				deltaSizes,
				deltaPercents,
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

exports.deltaFromStats = deltaFromStats;
