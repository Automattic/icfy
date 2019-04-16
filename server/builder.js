const { log, sleep } = require('./utils');
const builder = require('./build-circle');
const db = require('./db');
const commentOnGithub = require('./comments');

function recordBundleStats({ sha, chunkStats, chunkGroups }) {
	const chlen = chunkStats.length;
	const cglen = chunkGroups.length;
	log(`Recording stats for ${sha}: ${chlen} chunks, ${cglen} chunk groups`);
	return Promise.all([db.insertChunkStats(chunkStats), db.insertChunkGroups(chunkGroups)]);
}

async function processQueue() {
	while (true) {
		const pushes = await db.getQueuedPushes();

		log(`Processing build queue of ${pushes.length} pushes`);
		for (const push of pushes) {
			const result = await builder.processPush(push);

			if (!result) {
				const age = ((Date.now() - push.created_at) / (1000 * 60 * 60)).toFixed(1);

				log(`Push ${push.sha} in ${push.branch} at ${push.created_at.toISOString()} not processed`);

				if (push.branch !== 'master' && age > 24) {
					log(`Removing push ${push.sha} because it's older than 24 hours (${age}h)`);
					await db.removePush(push.sha);
				} else if (push.branch === 'master' && age > 240) {
					log(`Removing push ${push.sha} because it's older than 10 days (${age}h)`);
					await db.removePush(push.sha);
				}

				continue;
			}

			const { ancestor, stats } = result;
			if (ancestor) await db.setPushAncestor(push.sha, ancestor);
			if (stats) await recordBundleStats(stats);

			await db.markPushAsProcessed(push.sha);
			await commentOnGithub(push.sha);
		}
		log(`Finished processing build queue of ${pushes.length} pushes`);

		// wait a minute before querying for pushes again
		await sleep(60000);
	}
}

processQueue().catch(console.error);
