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

exports.getChunkGroupChartData = (period, chunk, loadedChunks, branch = 'master') => {
	const lastCount = periodToLastCount(period);

	const mainSizesQuery = getChunkSizes(chunk, branch, lastCount);

	const groupSizesQuery = K.select(
		K.raw(
			_.join([
				'p.sha',
				'p.created_at',
				'sum(s.stat_size) as stat_size',
				'sum(s.parsed_size) as parsed_size',
				'sum(s.gzip_size) as gzip_size',
			])
		)
	)
		.from('pushes as p')
		.join('chunk_groups as cg', 'cg.sha', 'p.sha')
		.join('stats as s', { 's.sha': 'cg.sha', 's.chunk': 'cg.sibling' })
		.groupBy('p.sha')
		.where({ 'p.branch': branch, 'cg.chunk': chunk })
		.orderBy('p.created_at', 'desc')
		.limit(lastCount);

	return Promise.all([mainSizesQuery, groupSizesQuery]).then(([mainSizes, groupSizes]) => {
		for (const mainSize of mainSizes) {
			groupSize = _.find(groupSizes, { sha: mainSize.sha });
			if (groupSize) {
				for (const size of ['stat_size', 'parsed_size', 'gzip_size']) {
					mainSize[size] += groupSize[size];
				}
			}
		}
		return _.sortBy(mainSizes, 'created_at');
	});
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
