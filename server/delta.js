const _ = require('lodash');

const sizes = ['stat_size', 'parsed_size', 'gzip_size'];
const ZERO_SIZE = sizes.reduce((acc, size) => ({...acc, [size]: 0}), {});

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

function findDuplicateChunkGroups(grouped) {
	// find chunk groups whose chunk sets are equal by sorting into "equality classes"
	const equalGroups = []; // array of { chunkSet, groupNames } tuples
	for (const [groupName, chunkSet] of Object.entries(grouped)) {
		const entry = equalGroups.find(record => _.isEqual(record.chunkSet, chunkSet));
		if (entry) {
			entry.groupNames.push(groupName);
		} else {
			equalGroups.push({ chunkSet, groupNames: [groupName] });
		}
	}

	// go through the "equality classes", find ones with more that one member
	// and remove all the duplicate ones. Keep the one with shortest name.
	const chunkGroupsToRemove = _.flatMap(equalGroups, ({ groupNames }) => {
		if (groupNames.length < 2) {
			return [];
		}

		const shortestGroupName = _.minBy(groupNames, 'length');
		return groupNames.filter(groupName => groupName !== shortestGroupName);
	});

	return chunkGroupsToRemove;
}

function groupGroups(groups) {
	const grouped = {};
	for (const record of groups) {
		const group = record.chunk;
		const chunk = record.sibling;

		if (!grouped[group]) {
			grouped[group] = new Set();
		}

		grouped[group].add(chunk);
	}

	// remove duplicate group names (module, module-index, module-index-js)
	const chunkGroupsToRemove = findDuplicateChunkGroups(grouped);

	const groupedWithoutDuplicates = _.omit(grouped, chunkGroupsToRemove);

	// convert to arrays
	return _.map(groupedWithoutDuplicates, (chunkSet, groupName) => ({
		group: groupName,
		chunks: [...chunkSet],
	}));
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

// convert legacy entrypoint names to the modern ones
function canonicalName(name) {
	if (name === 'build') {
		return 'entry-main';
	}
	if (name === 'domainsLanding') {
		return 'entry-domains-landing';
	}

	return name;
}

function byChunkName(chunk) {
	const name = canonicalName(chunk.chunk);
	return ch => name === canonicalName(ch.chunk);
}

function byGroupName(group) {
	const name = canonicalName(group.group);
	return g => name === canonicalName(g.group);
}

function deltaFromStats(firstStats, secondStats) {
	const deltas = [];

	for (const firstStat of firstStats) {
		const secondStat = secondStats.find(byChunkName(firstStat));
		const name = (secondStat || firstStat).chunk; // prefer the second chunk's name
		const firstHash = firstStat.hash;
		const secondHash = secondStat ? secondStat.hash : null;

		const firstSizes = sizesOf(firstStat);
		const secondSizes = sizesOf(secondStat);
		const deltaSizes = deltaSizesOf(firstSizes, secondSizes);
		const deltaPercents = deltaPercentsOf(firstSizes, deltaSizes);

		if (_.some(deltaSizes, size => size !== 0)) {
			deltas.push({
				name,
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
		if (!firstStats.find(byChunkName(secondStat))) {
			const name = secondStat.chunk;
			const firstHash = null;
			const firstSizes = null;
			const secondHash = secondStat.hash;
			const secondSizes = sizesOf(secondStat);
			const deltaSizes = deltaSizesOf(firstSizes, secondSizes);

			deltas.push({
				name,
				firstHash,
				firstSizes,
				secondHash,
				secondSizes,
				deltaSizes,
			});
		}
	}

	return sortByDelta(deltas);
}

function addStyleGroup(stats, groups) {
	if (_.find(stats, { chunk: 'style.css' })) {
		groups.push({ group: 'style.css', chunks: ['style.css'] });
	}
}

function extractManifestGroup(stats, groups) {
	if (_.find(stats, { chunk: 'manifest' })) {
		for (const group of groups) {
			if (group.chunks.includes('manifest')) {
				group.chunks = group.chunks.filter(chunk => chunk !== 'manifest');
			}
		}
		groups.push({ group: 'manifest', chunks: ['manifest'] });
	}
}

function isDeltaEligible(deltaSizes) {
	// ignore tiny changes smaller than 10 bytes
	return Math.abs(_.get(deltaSizes, 'parsed_size', 0)) > 10;
}

function deltaFromStatsAndGroups(firstStats, firstGroups, secondStats, secondGroups, options) {
	firstGroups = groupGroups(firstGroups);
	secondGroups = groupGroups(secondGroups);

	addStyleGroup(firstStats, firstGroups);
	addStyleGroup(secondStats, secondGroups);

	if (_.get(options, 'extractManifestGroup', false)) {
		extractManifestGroup(firstStats, firstGroups);
		extractManifestGroup(secondStats, secondGroups);
	}

	const deltas = [];

	for (const firstGroup of firstGroups) {
		const secondGroup = secondGroups.find(byGroupName(firstGroup));
		const name = (secondGroup || firstGroup).group; // prefer the second group's name
		const firstSizes = sizesOfGroup(firstGroup, firstStats);
		const secondSizes = sizesOfGroup(secondGroup, secondStats);
		const deltaSizes = deltaSizesOf(firstSizes, secondSizes);
		const deltaPercents = deltaPercentsOf(firstSizes, deltaSizes);
		const firstChunks = (firstGroup || {}).chunks || [];
		const secondChunks = (secondGroup || {}).chunks || [];

		if (isDeltaEligible(deltaSizes)) {
			deltas.push({
				name,
				firstSizes,
				secondSizes,
				deltaSizes,
				deltaPercents,
				firstChunks,
				secondChunks,
			});
		}
	}

	for (const secondGroup of secondGroups) {
		if (!firstGroups.find(byGroupName(secondGroup))) {
			const name = secondGroup.group;
			const firstSizes = null;
			const secondSizes = sizesOfGroup(secondGroup, secondStats);
			const deltaSizes = deltaSizesOf(firstSizes, secondSizes);
			const firstChunks = [];
			const secondChunks = secondGroup.chunks || [];

			deltas.push({
				name,
				firstSizes,
				secondSizes,
				deltaSizes,
				firstChunks,
				secondChunks,
			});
		}
	}

	return sortByDelta(deltas);
}

exports.deltaFromStats = deltaFromStats;
exports.deltaFromStatsAndGroups = deltaFromStatsAndGroups;
exports.sumSizesOf = sumSizesOf;
exports.ZERO_SIZE = ZERO_SIZE;
