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

// convert legacy entrypoint names to the modern ones
function canonicalGroupName(name) {
	if (name === 'build') {
		return 'entry-main';
	}
	if (name === 'domainsLanding') {
		return 'entry-domains-landing';
	}

	return name;
}

function byGroupName(group) {
	const name = canonicalGroupName(group.group);
	return g => name === canonicalGroupName(g.group);
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
		const secondGroup = _.find(secondGroups, byGroupName(firstGroup));
		const name = (secondGroup || firstGroup).group; // prefer the second group's name
		const firstSizes = sizesOfGroup(firstGroup, firstStats);
		const secondSizes = sizesOfGroup(secondGroup, secondStats);
		const deltaSizes = deltaSizesOf(firstSizes, secondSizes);
		const deltaPercents = deltaPercentsOf(firstSizes, deltaSizes);

		if (isDeltaEligible(deltaSizes)) {
			deltas.push({
				name,
				firstSizes,
				secondSizes,
				deltaSizes,
				deltaPercents,
			});
		}
	}

	for (const secondGroup of secondGroups) {
		if (!_.find(firstGroups, byGroupName(secondGroup))) {
			const name = secondGroup.group;
			const firstSizes = null;
			const secondSizes = sizesOfGroup(secondGroup, secondStats);
			const deltaSizes = deltaSizesOf(firstSizes, secondSizes);

			deltas.push({
				name,
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
