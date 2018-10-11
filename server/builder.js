const { log, sleep } = require('./utils');
const localBuilder = require('./build-local');
const {
	getQueuedPushes,
	markPushAsProcessed,
	setPushAncestor,
	insertChunkStats,
	insertChunkGroups,
} = require('./db');

function recordBundleStats({ sha, chunkStats, chunkGroups }) {
	const chlen = chunkStats.length;
	const cglen = chunkGroups.length;
	log(`Recording stats for ${sha}: ${chlen} chunks, ${cglen} chunk groups`);
	return Promise.all([insertChunkStats(chunkStats), insertChunkGroups(chunkGroups)]);
}

async function processQueue() {
	while (true) {
		const pushes = await getQueuedPushes();
		for (const push of pushes) {
			const { ancestor, stats } = await localBuilder.processPush(push);

			if (ancestor) await setPushAncestor(push.sha, ancestor);
			if (stats) await recordBundleStats(stats);

			await markPushAsProcessed(push.sha);
		}

		if (pushes.length === 0) {
			// wait a minute before querying for pushes again
			await sleep(60000);
		}
	}
}

processQueue().catch(console.error);
