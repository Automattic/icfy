const { join } = require('path');
const _ = require('lodash');

const { log, sleep } = require('./utils');
const cmd = require('./cmd');
const analyzeBundle = require('./analyze');
const {
	getQueuedPushes,
	markPushAsProcessed,
	setPushAncestor,
	insertChunkStats,
	insertChunkGroups,
} = require('./db');

const statsDir = join(process.cwd(), 'stats');
const repoDir = join(process.cwd(), 'wp-calypso');

async function processPush(push) {
	process.chdir(repoDir);

	// fetch the latest revisions from GitHub
	await cmd('git fetch --prune');

	// checkout the revision we want
	await cmd(`git checkout ${push.sha}`);

	// determine the ancestor
	if (push.branch !== 'master' && !push.ancestor) {
		const ancestorSha = await cmd('git merge-base HEAD origin/master', { returnStdout: true });
		console.log(`ancestor of ${push.branch} (${push.sha}): [${ancestorSha}]`);
		await setPushAncestor(push.sha, ancestorSha);
	}

	// update node_modules
	await cmd('npm ci');

	// build CSS -- the JS build depends on the CSS files
	await cmd('npm run build-css');

	// run the JS build in webpack analyze mode
	await cmd('npm run preanalyze-bundles', {
		useShell: true,
		env: {
			NODE_ENV: 'production',
			CALYPSO_CLIENT: 'true',
		},
	});

	// generate the chart data
	log('Analyzing the bundle stats');
	const bundleStats = analyzeBundle(push);

	// remove the stat files
	await cmd('rm stats.json chart.json');

	// cleanup after the build, including the node_modules directory.
	// we do a clean build for every push
	await cmd('npm run distclean');

	process.chdir('..');

	return bundleStats;
}

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
			const pushStats = await processPush(push);
			await recordBundleStats(pushStats);
			await markPushAsProcessed(push.sha);
		}

		if (pushes.length === 0) {
			// wait a minute before querying for pushes again
			await sleep(60000);
		}
	}
}

processQueue().catch(console.error);
