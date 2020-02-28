const _ = require('lodash');
const { log } = require('./utils');
const db = require('./db');
const analyzeBundle = require('./analyze');
const circleBuilder = require('./build-circle');
const githubBuilder = require('./build-github');

function getBuilder(from) {
	switch (from) {
		case 'circle':
			return circleBuilder;
		case 'github':
			return githubBuilder;
		default:
			return null;
	}
}

async function processPush(push) {
	// Find last successful build for this push
	const builds = await db.getCIBuilds(push.sha);
	const build = _.findLast(builds, 'success');
	if (!build) {
		return null;
	}

	// Download stats from CI artifacts
	const builder = getBuilder(build.from);
	if (!builder) {
		return null;
	}

	const stats = await builder(build.build_num);
	if (!stats) {
		return null;
	}

	// Analyze the downloaded stats
	const result = {
		stats: analyzeBundle(push.sha, stats),
	};

	// determine the ancestor
	if (build.ancestor && push.branch !== 'master' && !push.ancestor) {
		log(`ancestor of ${push.branch} (${push.sha}): [${build.ancestor}]`);
		result.ancestor = build.ancestor;
	}

	return result;
}

module.exports = processPush;
