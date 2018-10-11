const { join } = require('path');
const cmd = require('./cmd');
const { log } = require('./utils');
const analyzeBundle = require('./analyze');

const repoDir = join(process.cwd(), 'wp-calypso');

exports.processPush = async function(push) {
	const result = {};

	process.chdir(repoDir);

	// fetch the latest revisions from GitHub
	await cmd('git fetch --prune');

	// checkout the revision we want
	await cmd(`git checkout ${push.sha}`);

	// determine the ancestor
	if (push.branch !== 'master' && !push.ancestor) {
		const ancestorSha = await cmd('git merge-base HEAD origin/master', { returnStdout: true });
		log(`ancestor of ${push.branch} (${push.sha}): [${ancestorSha}]`);
		result.ancestor = ancestorSha;
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

	result.stats = bundleStats;

	return result;
}
