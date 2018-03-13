const { writeFileSync } = require('fs');
const { spawn, exec } = require('child_process');
const { join } = require('path');
const { readStatsFromFile, getViewerData } = require('webpack-bundle-analyzer/lib/analyzer');

const { log, sleep } = require('./utils');
const { getQueuedPushes, markPushAsProcessed, setPushAncestor, insertChunkStats } = require('./db');

const statsDir = join(process.cwd(), 'stats');
const repoDir = join(process.cwd(), 'wp-calypso');

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
	process.chdir(repoDir);

	// fetch the latest revisions from GitHub
	await cmd('git fetch');

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
	if (push.branch.includes('webpack4')) {
		await cmd('node bin/generate-stats.js', {
			useShell: true,
			env: {
				NODE_ENV: 'production',
				NODE_PATH: 'client',
				CALYPSO_CLIENT: 'true',
			},
		});
	} else {
		await cmd(
			'npm run -s env -- node --max_old_space_size=8192 ./node_modules/.bin/webpack --config webpack.config.js --profile --json > stats.json',
			{
				useShell: true,
				env: {
					NODE_ENV: 'production',
					CALYPSO_CLIENT: 'true',
				},
			}
		);
	}
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

	for (const asset of chart) {
		const { sha, created_at } = push;
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
