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

exports.getChunkGroupChartData = async (period, chunks, loadedChunks, branch = 'master') => {
	chunks = _.split(chunks, ',');
	loadedChunks = _.split(loadedChunks, ',');

	const lastCount = periodToLastCount(period);

	// annotate each chunk so that it is its own sibling
	const chunksSizes = _.flatMap(
		await Promise.all(
			chunks.map(c => {
				return getChunkSizes(c, branch, lastCount).then(sizes =>
					sizes.map(size => ({
						sibling: c,
						...size,
					}))
				);
			})
		)
	);

	const shas = _.uniq(_.map(chunksSizes, 'sha'));
	const siblingSizes = _.flatMap(
		await Promise.all(chunks.map(chunk => getSiblingWithSizes(shas, chunk)))
	);

	const toLoadSizes = _.uniqWith(chunksSizes.concat(siblingSizes), _.isEqual);
	const explicitlyExcludedChunks = _.flatMap(loadedChunks, chunk =>
		shas.map(sha => ({ sha, sibling: chunk }))
	);
	const toExcludeChunks = explicitlyExcludedChunks.concat(await getSiblings(shas, loadedChunks));

	const summedChunks = shas.map(sha => {
		const chunksToExcludeForPush = toExcludeChunks.filter(c => c.sha === sha).map(c => c.sibling);
		const chunksToIncludeForPush = toLoadSizes
			.filter(c => c.sha === sha)
			.filter(c => !chunksToExcludeForPush.includes(c.sibling));

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
