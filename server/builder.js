const { writeFileSync } = require('fs');
const { join } = require('path');
const _ = require('lodash');
const { readStatsFromFile, getViewerData } = require('webpack-bundle-analyzer/lib/analyzer');

const { log, sleep } = require('./utils');
const cmd = require('./cmd');
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
	await cmd('npm install');

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
	await analyzeBundle(push);

	// remove the stat files
	await cmd('rm stats.json chart.json');

	// cleanup after the build, including the node_modules directory.
	// we do a clean build for every push
	await cmd('npm run distclean');

	process.chdir('..');
}

async function analyzeBundle(push) {
	const stats = readStatsFromFile('stats.json');
	const chart = getViewerData(stats, './public');
	writeFileSync('chart.json', JSON.stringify(chart, null, 2));

	const { sha, created_at } = push;

	for (const asset of chart) {
		const [chunk, hash] = asset.label.split('.');

		const newStat = {
			sha,
			created_at,
			chunk,
			hash,
			stat_size: asset.statSize,
			parsed_size: asset.parsedSize,
			gzip_size: asset.gzipSize,
		};
		await insertChunkStats(newStat);
		log(`Recorded new stat: sha=${sha} chunk=${chunk}`);
	}

	const webpackMajorVersion = parseInt(stats.version, 10);

	let newChunkGroups = [];
	if (webpackMajorVersion >= 4) {
		const newChunkGroups = _.flatMap(stats.chunks, chunk =>
			chunk.siblings.map(sibling => ({
				sha,
				chunk: chunk.id,
				sibling,
			}))
		);
	} else {
		// support for webpack < 4
		newChunkGroups = [
			{ sha, chunk: 'build', sibling: 'manifest' },
			{ sha, chunk: 'build', sibling: 'vendor' },
		];
	}

	await insertChunkGroups(newChunkGroups);
}

async function processQueue() {
	while (true) {
		const pushes = await getQueuedPushes();
		for (const push of pushes) {
			await processPush(push);
			await markPushAsProcessed(push.sha);
		}

		if (pushes.length === 0) {
			// wait a minute before querying for pushes again
			await sleep(60000);
		}
	}
}

processQueue().catch(console.error);
