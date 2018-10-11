const { log, sleep } = require('./utils');
const localBuilder = require('./build-local');
const circleBuilder = require('./build-circle');
const db = require('./db');

function recordBundleStats({ sha, chunkStats, chunkGroups }) {
	const chlen = chunkStats.length;
	const cglen = chunkGroups.length;
	log(`Recording stats for ${sha}: ${chlen} chunks, ${cglen} chunk groups`);
	return Promise.all([db.insertChunkStats(chunkStats), db.insertChunkGroups(chunkGroups)]);
}

async function processQueue() {
	while (true) {
		let skippedSomeBuild = false;
		const pushes = await db.getQueuedPushes();
		for (const push of pushes) {
			const builder = push.branch === 'master' ? localBuilder : circleBuilder;
			const result = await builder.processPush(push);

			if (!result) {
				log(`Push ${push.sha} was not processed, will try again in a while`);
				skippedSomeBuild = true;
				continue;
			}

			const { ancestor, stats } = result;
			if (ancestor) await db.setPushAncestor(push.sha, ancestor);
			if (stats) await recordBundleStats(stats);

			await db.markPushAsProcessed(push.sha);
		}

		if (skippedSomeBuild || pushes.length === 0) {
			// wait a minute before querying for pushes again
			await sleep(60000);
		}
	}
}

processQueue().catch(console.error);
