const _ = require('lodash');

const sizes = ['stat_size', 'parsed_size', 'gzip_size'];

function sizesOf(stat) {
	return stat ? _.pick(stat, sizes) : null;
}

function sumSizesOf(firstSizes, secondSizes) {
	if (!firstSizes) {
		return secondSizes;
	}

	if (!secondSizes) {
		return firstSizes;
	}

	return _.fromPairs(sizes.map(size => [size, firstSizes[size] + secondSizes[size]]));
}

function deltaSizesOf(firstSizes, secondSizes) {
	if (!firstSizes) {
		// new chunk, the delta is the full size of the second version
		return secondSizes;
	}

	if (!secondSizes) {
		// deleted chunk, the delta is the negative full size of the first version
		return _.mapValues(firstSizes, size => -size);
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

		return (deltaSizes[type] / firstSize) * 100;
	});
}

function groupGroups(groups) {
	const grouped = {};
	for (const record of groups) {
		const group = record.chunk;
		const chunk = record.sibling;

		// skip moment-locale-xx-js chunk groups with buggy names
		if (/^moment-locale-.*-js$/.test(group)) {
			continue;
		}

		if (!grouped[group]) {
			grouped[group] = [group]; // every group has the same-named chunk as member
		}
		if (!grouped[group].includes(chunk)) {
			grouped[group].push(chunk);
		}
	}
	return _.map(grouped, (chunks, group) => ({ group, chunks }));
}

function sizesOfGroup(group, stats) {
	if (!group) {
		return null;
	}

	return group.chunks.map(chunk => sizesOf(_.find(stats, { chunk }))).reduce(sumSizesOf);
}

function sortByDelta(deltas) {
	return _.reverse(_.sortBy(deltas, delta => Math.abs(delta.deltaSizes.parsed_size)));
}

function deltaFromStats(firstStats, secondStats) {
	const deltas = [];

	for (const firstStat of firstStats) {
		const chunk = firstStat.chunk;
		const firstHash = firstStat.hash;
		const secondStat = secondStats.find(s => s.chunk === chunk);
		const secondHash = secondStat ? secondStat.hash : null;

		const firstSizes = sizesOf(firstStat);
		const secondSizes = sizesOf(secondStat);
		const deltaSizes = deltaSizesOf(firstSizes, secondSizes);
		const deltaPercents = deltaPercentsOf(firstSizes, deltaSizes);

		if (_.some(deltaSizes, size => size !== 0)) {
			deltas.push({
				name: chunk,
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
				name: secondStat.chunk,
				firstHash: null,
				firstSizes,
				secondHash: secondStat.hash,
				secondSizes,
				deltaSizes,
			});
		}
	}

	return sortByDelta(deltas);
}

function deltaFromStatsAndGroups(firstStats, firstGroups, secondStats, secondGroups) {
	firstGroups = groupGroups(firstGroups);
	secondGroups = groupGroups(secondGroups);

	const deltas = [];

	for (const firstGroup of firstGroups) {
		const group = firstGroup.group;
		const secondGroup = _.find(secondGroups, { group });
		const firstSizes = sizesOfGroup(firstGroup, firstStats);
		const secondSizes = sizesOfGroup(secondGroup, secondStats);
		const deltaSizes = deltaSizesOf(firstSizes, secondSizes);
		const deltaPercents = deltaPercentsOf(firstSizes, deltaSizes);

		if (_.some(deltaSizes, size => size !== 0)) {
			deltas.push({
				name: group,
				firstSizes,
				secondSizes,
				deltaSizes,
				deltaPercents,
			});
		}
	}

	for (const secondGroup of secondGroups) {
		const group = secondGroup.group;
		if (!_.find(firstGroups, { group })) {
			const firstSizes = null;
			const secondSizes = sizesOfGroup(secondGroup, secondStats);
			const deltaSizes = deltaSizesOf(firstSizes, secondSizes);

			deltas.push({
				name: group,
				firstSizes,
				secondSizes,
				deltaSizes,
			});
		}
	}

	return sortByDelta(deltas);
}

exports.deltaFromStats = deltaFromStats;
exports.deltaFromStatsAndGroups = deltaFromStatsAndGroups;
