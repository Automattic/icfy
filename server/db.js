const _ = require('lodash');
const knex = require('knex');
const config = require('./knexfile');
const { deltaFromStats } = require('./delta');

const K = knex(config);

// Measure and report how long a promise takes to resolve or reject
function timed(promise, label) {
	console.time(label);
	promise.then(() => console.timeEnd(label), () => console.timeEnd(label));
	return promise;
}

exports.getPush = sha =>
	K('pushes')
		.select()
		.where('sha', sha);

exports.insertPush = push => K('pushes').insert(push);

exports.getLastPush = () =>
	K('pushes')
		.select()
		.where('branch', 'master')
		.orderBy('id', 'desc')
		.limit(1);

exports.getPushesForBranch = branch =>
	K('pushes')
		.select()
		.where('branch', branch)
		.orderBy('id', 'desc')
		.limit(100);

exports.getQueuedPushes = () =>
	K('pushes')
		.select()
		.where('processed', false);

exports.markPushAsProcessed = sha =>
	K('pushes')
		.update('processed', true)
		.where('sha', sha);

exports.setPushAncestor = (sha, ancestorSha) =>
	K('pushes')
		.update('ancestor', ancestorSha)
		.where('sha', sha);

exports.insertChunkStats = stats => K('stats').insert(stats);

exports.insertChunkGroups = chunkGroups => K('chunk_groups').insert(chunkGroups);

exports.getKnownChunks = async function() {
	// find the SHA of last processed master push
	const lastPushArr = await K('pushes')
		.select('sha')
		.where({ branch: 'master', processed: true })
		.orderBy('created_at', 'desc')
		.limit(1);

	if (lastPushArr.length === 0) {
		throw new Error('last processed master push not found');
	}

	const lastPushSha = lastPushArr[0].sha;
	const lastPushStats = await K.select()
		.distinct('chunk')
		.from('stats')
		.where('sha', lastPushSha);

	return lastPushStats.map(row => row.chunk);
};

function periodToLastCount(period) {
	let lastCount = 200;
	const lastReMatch = /^last(\d+)$/.exec(period);
	if (lastReMatch) {
		lastCount = Number(lastReMatch[1]);
	}
	return lastCount;
}

async function getPushShas(branch, lastCount) {
	const masterPushesQuery = K('pushes')
		.select(['sha', 'created_at'])
		.where({ branch: 'master', processed: true })
		.orderBy('created_at', 'desc')
		.limit(lastCount);

	if (branch === 'master') {
		return masterPushesQuery;
	}

	const [patchBranchPush] = await K('pushes')
		.select(['sha', 'created_at', 'ancestor'])
		.where({ branch, processed: true })
		.orderBy('created_at', 'desc')
		.limit(1);

	if (!patchBranchPush || !patchBranchPush.ancestor) {
		return masterPushesQuery;
	}

	const masterPushes = await masterPushesQuery;
	const branchPointPushIndex = _.findIndex(masterPushes, { sha: patchBranchPush.ancestor });
	if (branchPointPushIndex !== -1) {
		masterPushes.splice(0, branchPointPushIndex, patchBranchPush);
	}

	return masterPushes;
}

exports.getChartData = async (period, chunk, branch = 'master') => {
	const lastCount = periodToLastCount(period);
	const pushes = await timed(getPushShas(branch, lastCount), 'getPushShas');
	const shas = _.map(pushes, 'sha');
	const stats = await K('stats')
		.select(['sha', 'stat_size', 'parsed_size', 'gzip_size'])
		.where('sha', 'in', shas)
		.andWhere('chunk', chunk);

	const pushesWithStats = pushes.map(({ sha, created_at }) => {
		const pushStats = _.find(stats, { sha });
		if (!pushStats) {
			return null;
		}

		return {
			sha,
			created_at,
			stat_size: pushStats.stat_size,
			parsed_size: pushStats.parsed_size,
			gzip_size: pushStats.gzip_size,
		};
	});

	return _.sortBy(pushesWithStats.filter(Boolean), 'created_at');
};

function getChunkSizes(shas, chunks) {
	return K('stats')
		.select(['sha', 'chunk', 'stat_size', 'parsed_size', 'gzip_size'])
		.where('sha', 'in', shas)
		.andWhere('chunk', 'in', chunks);
}

async function getSiblings(shas, chunks) {
	if (_.isEmpty(chunks)) {
		return [];
	}

	return await K.distinct(['sha', 'sibling'])
		.select()
		.from('chunk_groups')
		.where('sha', 'in', shas)
		.andWhere('chunk', 'in', chunks);
}

function getSiblingsWithSizes(shas, chunks) {
	return K.select(['s.sha', 'cg.sibling', 's.stat_size', 's.parsed_size', 's.gzip_size'])
		.from('chunk_groups as cg')
		.join('stats as s', { 'cg.sha': 's.sha', 'cg.sibling': 's.chunk' })
		.where('cg.sha', 'in', shas)
		.andWhere('cg.chunk', 'in', chunks)
		.groupBy('sha', 'sibling');
}

/*
 * This function has a few parts.  The total result is is the summation of:
 * sum( _.difference( ( explicitly called out chunks and their siblings ),  ( explicitly excluded chunks and their siblings) ) )
 * on a sha by sha basis.
 *
 * The steps are then:
 * 1. process chunks and excluded chunks (loadedChunks) into two arrays of type Array<ChunkName>
 * 2. collect chunksToInclude: of the `chunks` sizes, and all of their siblings sizes on per commit basis.
 * 3. collect chunksToExclude: all of the `loadedChunks`, and all of their siblings on a per commit basis. Note that we do not need sizes since we don't actually subtract,
 *      we just decide not to add them.
 * 4. sum the chunks on a sha by sha basis
 */
exports.getChunkGroupChartData = async (period, chunks, loadedChunks, branch = 'master') => {
	const lastCount = periodToLastCount(period);

	loadedChunks = loadedChunks ? _.uniq(_.split(loadedChunks, ',')) : [];
	chunks = chunks ? _.uniq(_.split(chunks, ',')) : [];

	// Retrieve the list of shas (and their created_at timestamps) we will collect size stats for
	const pushes = await timed(getPushShas(branch, lastCount), 'getPushShas');
	const shas = _.map(pushes, 'sha');

	/*
	* Accumulate a flat list of all of the chunks explicitly called out to load (per sha)
	* We can't sum this for the totals just yet because need to also get all of the the chunks'
	* siblings per sha.
	*
	* If chunks are always their own siblings we can skip this step
	* and just get the past N shas.
	*/

	// Sizes of the requested chunks themselves
	const chunkSizes = await timed(getChunkSizes(shas, chunks), 'getChunkSizes');
	// Sizes of the requested chunks' siblings
	const toIncludeSiblings = await timed(getSiblingsWithSizes(shas, chunks), 'getSiblingsWithSizes');
	// Names of the excluded siblings (siblings of loadedChunks)
	const toExcludeSiblings = await timed(getSiblings(shas, loadedChunks), 'getSiblings');

	// Group'em all by SHA
	const chunksToIncludeByPush = _.groupBy(chunkSizes, 'sha');
	const siblingsToIncludeByPush = _.groupBy(toIncludeSiblings, 'sha');
	const siblingsToExcludeByPush = _.groupBy(toExcludeSiblings, 'sha');

	const summedChunks = pushes.map(({ sha, created_at }) => {
		const chunksToInclude = chunksToIncludeByPush[sha];
		const siblingsToInclude = siblingsToIncludeByPush[sha];
		const siblingsToExclude = siblingsToExcludeByPush[sha];

		// requested chunks: filter out the ones in the exclusion list
		const chunksToSum = _.reject(
			chunksToInclude,
			c => _.includes(loadedChunks, c.chunk) || _.find(siblingsToExclude, { sibling: c.chunk })
		);

		// requested chunks' siblings: filter out the root chunks and the exclusion list
		const siblingsToSum = _.reject(
			siblingsToInclude,
			c =>
				_.includes(loadedChunks, c.sibling) ||
				_.find(chunksToInclude, { chunk: c.sibling }) ||
				_.find(siblingsToExclude, { sibling: c.sibling })
		);

		const allToSum = _.concat(chunksToSum, siblingsToSum);

		return {
			sha,
			created_at,
			stat_size: _.sumBy(allToSum, 'stat_size'),
			parsed_size: _.sumBy(allToSum, 'parsed_size'),
			gzip_size: _.sumBy(allToSum, 'gzip_size'),
		};
	});

	return _.sortBy(summedChunks, 'created_at');
};

const getPushStats = sha =>
	K('stats')
		.select()
		.where('sha', sha);

exports.getPushStats = getPushStats;

exports.getPushDelta = async function(first, second) {
	const [firstStats, secondStats] = await Promise.all([first, second].map(getPushStats));
	return deltaFromStats(firstStats, secondStats);
};

exports.getPushLog = count =>
	K('pushes')
		.select()
		.orderBy('id', 'desc')
		.limit(count);

exports.removePush = sha =>
	K('pushes')
		.delete()
		.where('sha', sha)
		.andWhereNot('branch', 'master')
		.andWhere('processed', false);
