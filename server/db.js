const _ = require('lodash');
const knex = require('knex');
const config = require('./knexfile');
const { deltaFromStats } = require('./delta');

const K = knex(config);

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

function getChunkSizes(chunk, branch, lastCount) {
	return K.select(['p.sha', 'p.created_at', 's.stat_size', 's.parsed_size', 's.gzip_size'])
		.from('pushes as p')
		.join('stats as s', 'p.sha', 's.sha')
		.where({ 'p.branch': branch, 's.chunk': chunk })
		.orderBy('p.created_at', 'desc')
		.limit(lastCount);
}

exports.getChartData = (period, chunk, branch = 'master') => {
	const lastCount = periodToLastCount(period);
	return getChunkSizes(chunk, branch, lastCount).then(res => _.sortBy(res, 'created_at'));
};

function getSiblings(shas, chunks) {
	if (_.isEmpty(chunks)) {
		return [];
	}

	return K.distinct(['p.sha', 'cg.sibling'])
		.select()
		.from('pushes as p')
		.join('chunk_groups as cg', 'cg.sha', 'p.sha')
		.where('p.sha', 'in', shas)
		.andWhere('cg.chunk', 'in', chunks);
}

function getSiblingWithSizes(shas, chunk) {
	return K.select([
		'p.sha',
		'p.created_at',
		'cg.sibling',
		's.stat_size',
		's.parsed_size',
		's.gzip_size',
	])
		.from('pushes as p')
		.join('chunk_groups as cg', 'cg.sha', 'p.sha')
		.join('stats as s', { 's.sha': 'cg.sha', 's.chunk': 'cg.sibling' })
		.whereIn('p.sha', shas)
		.andWhere('cg.chunk', chunk);
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

	loadedChunks = loadedChunks === '' ? [] : _.uniq(_.split(loadedChunks, ','));
	chunks = chunks === '' ? [] : _.uniq(_.split(chunks, ','));

	// skip chunks that are found in both  loadedChunks and chunks.
	// only keep it in loadedChunks in case it has shared sibling chunks with other things to load
	// lets us skip work that sums to 0
	const commonChunks = _.intersection(loadedChunks, chunks);
	chunks = _.without(chunks, ...commonChunks);

	/*
	* Accumulate a flat list of all of the chunks explicitly called out to load (per sha)
	* We can't sum this for the totals just yet because need to also get all of the the chunks' 
	* siblings per sha.
	*
	* If chunks are always their own siblings we can skip this step 
	* and just get the past N shas.
	*/
	const chunksSizes = _.flatMap(
		await Promise.all(chunks.map(c => getChunkSizes(c, branch, lastCount)))
	);
	const shas = _.uniq(_.map(chunksSizes, 'sha')); // array of the last ${period} git shas

	const siblingSizes = _.flatMap(
		await Promise.all(chunks.map(chunk => getSiblingWithSizes(shas, chunk)))
	);
	const toIncludeChunks = _.uniqWith(siblingSizes, _.isEqual);

	const explicitlyExcludedChunks = _.flatMap(loadedChunks, chunk =>
		shas.map(sha => ({ sha, sibling: chunk }))
	);

	const toExcludeChunks = _.uniqWith(
		explicitlyExcludedChunks.concat(await getSiblings(shas, loadedChunks)),
		_.isEqual
	);

	const chunksToIncludeByPush = _.groupBy(toIncludeChunks, 'sha');
	const chunksToExcludeByPush = _.mapValues(_.groupBy(toExcludeChunks, 'sha'), chunk =>
		_.map(chunk, 'sibling')
	);

	const summedChunks = shas.map(sha => {
		const chunksToIncludeForPush = _.reject(chunksToIncludeByPush[sha], c =>
			_.includes(chunksToExcludeByPush[sha], c.sibling)
		);

		return {
			sha,
			created_at: chunksToIncludeForPush[0].created_at,
			stat_size: _.sumBy(chunksToIncludeForPush, 'stat_size'),
			parsed_size: _.sumBy(chunksToIncludeForPush, 'parsed_size'),
			gzip_size: _.sumBy(chunksToIncludeForPush, 'gzip_size'),
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
