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

exports.insertChunkStats = stats => K('stats').insert(stats);

exports.getKnownChunks = () =>
	K('stats')
		.distinct('chunk')
		.select()
		.then(res => res.map(row => row.chunk));

exports.getChartData = (period, chunk) => {
	let lastCount = 200;
	const lastReMatch = /^last(\d+)$/.exec(period);
	if (lastReMatch) {
		lastCount = Number(lastReMatch[1]);
	}
	const branch = 'master';
	return K.select('stats.*')
		.from('stats')
		.join('pushes', 'stats.sha', 'pushes.sha')
		.where({ 'pushes.branch': branch, 'stats.chunk': chunk })
		.orderBy('created_at', 'desc')
		.limit(lastCount)
		.then(res => _.sortBy(res, 'created_at'));
};

const getPushStats = sha =>
	K('stats')
		.select()
		.where('sha', sha);

exports.getPushStats = getPushStats;

exports.getPushDelta = async function(size, first, second) {
	const [firstStats, secondStats] = await Promise.all([first, second].map(getPushStats));
	return deltaFromStats(firstStats, secondStats, size);
};
