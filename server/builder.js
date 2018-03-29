const { writeFileSync } = require('fs');
const { spawn, exec } = require('child_process');
const { join } = require('path');
const _ = require('lodash');
const { readStatsFromFile, getViewerData } = require('webpack-bundle-analyzer/lib/analyzer');

const { log, sleep } = require('./utils');
const {
	getQueuedPushes,
	markPushAsProcessed,
	setPushAncestor,
	insertChunkStats,
	insertChunkGroups,
} = require('./db');

const statsDir = join(process.cwd(), 'stats');
const repoDir = join(process.cwd(), 'repository');

function startProc(cmdline, env, useShell) {
	if (useShell) {
		return exec(cmdline, { env });
	}

	const [command, ...args] = cmdline.split(' ');
	return spawn(command, args, { env });
}

function cmd(cmdline, options = {}) {
	return new Promise((resolve, reject) => {
		log(`Executing: ${cmdline} in ${process.cwd()}`);
		env = Object.assign({}, process.env, options.env);
		const proc = startProc(cmdline, env, options.useShell);

		let stdout;
		if (options.returnStdout) {
			stdout = '';
			proc.stdout.on('data', data => (stdout += data));
		}

		proc.on('close', code => {
			if (code === 0) {
				resolve(options.returnStdout ? stdout.trim() : code);
			} else {
				reject(`${cmdline} exited with code ${code}`);
			}
		});

		proc.on('error', err => reject(`${cmdline} failed to execute: ${err}`));
	});
}

async function processPush(push) {
	log(`Entering directory: ${repoDir}`);
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
	await cmd('yarn install');

	await cmd('npx webpack --config ./webpack.config.js --profile --json > stats.json', {
		useShell: true,
		env: {
			BABEL_ENV: 'production',
			NODE_ENV: 'production',
		},
	});

	// generate the chart data
	log('Analyzing the bundle stats...');
	try {
		await analyzeBundle(push);
	}
	catch(error) {
	  log(`Failed to analyze bundle stats:`);
	  log(error);
	}


	// remove the stat files
	await cmd('rm stats.json chart.json');

	// cleanup after the build, including the node_modules directory.
	// we do a clean build for every push
	await cmd('npm run distclean');

	process.chdir('..');
}

async function analyzeBundle(push) {
	log(`Analyzing bundle`);

	const stats = readStatsFromFile('stats.json');
	const chart = getViewerData(stats, './public');
	writeFileSync('chart.json', JSON.stringify(chart, null, 2));

	let newStat = {};

	for (const asset of chart) {
		const { sha, created_at } = push;
		const [chunk, hash] = asset.label.split('.');

		newStat = {
			sha,
			created_at,
			chunk,
			hash,
			stat_size: asset.statSize || 0,
			parsed_size: asset.parsedSize || 0,
			gzip_size: asset.gzipSize || 0,
		};
		await insertChunkStats(newStat);
		log(`Recorded new stat: sha=${sha} chunk=${chunk}`);
	}

	const webpackMajorVersion = parseInt(stats.version, 10);

	log(`Stats for Webpack v${webpackMajorVersion}`);

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
			{ sha: newStat.sha, chunk: 'build', sibling: 'manifest' },
			{ sha: newStat.sha, chunk: 'build', sibling: 'vendor' },
		];
	}

	log(`Save chunk groups`);
	await insertChunkGroups(newChunkGroups);
}

async function processQueue() {
	log(`Processing build queue`);
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
