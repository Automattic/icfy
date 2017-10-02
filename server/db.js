const co = require('co');
const knex = require('knex');
const config = require('./knexfile');
const K = knex(config);

exports.getPush = sha => K('pushes').select().where('sha', sha);

exports.insertPush = push => K('pushes').insert(push);

exports.getLastPush = () => K('pushes').select().orderBy('id', 'desc').limit(1);

exports.getQueuedPushes = () => K('pushes').select().where('processed', false);

exports.markPushAsProcessed = sha => K('pushes').update('processed', true).where('sha', sha);

exports.insertChunkStats = stats => K('stats').insert(stats);

exports.getKnownChunks = () =>
	K('stats').distinct('chunk').select().then(res => res.map(row => row.chunk));

exports.getChartData = (period, chunk) =>
	K('stats').select().where('chunk', chunk).orderBy('created_at');

exports.getPushDelta = co.wrap(function*(size, first, second) {
	const [firstStats, secondStats] = yield Promise.all(
		[first, second].map(sha => K('stats').select().where('sha', sha))
	);

	const deltas = [];
	for ( const firstStat of firstStats ) {
		const chunk = firstStat.chunk;
		const firstSize = firstStat[size];
		const firstHash = firstStat.hash;
		const secondStat = secondStats.find(s => s.chunk === chunk);
		const secondSize = secondStat ? secondStat[size] : null;
		const secondHash = secondStat ? secondStat.hash : null;

		if (firstHash !== secondHash) {
			deltas.push({ chunk, firstSize, secondSize });
		}
	}

	for ( const stat of secondStats ) {
		if (!firstStats.find(s => s.chunk === stat.chunk)) {
			deltas.push({ chunk: stat.chunk, firstSize: null, secondSize: stat[size] });
		}
	}

	return deltas;
});
