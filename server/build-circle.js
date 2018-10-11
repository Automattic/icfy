const { get } = require('axios');
const { log, timed } = require('./utils');
const db = require('./db');
const analyzeBundle = require('./analyze');

const REPO = 'Automattic/wp-calypso';

exports.processPush = async function(push) {
	// https://circleci.com/api/v1.1/project/github/Automattic/wp-calypso/110033/artifacts

	const [circleBuild] = await db.getCircleBuild(push.sha);
	if (!circleBuild) {
		return null;
	}

	const result = {};

	const { ancestor, build_num } = circleBuild;

	// determine the ancestor
	if (ancestor && push.branch !== 'master' && !push.ancestor) {
		log(`ancestor of ${push.branch} (${push.sha}): [${ancestor}]`);
		result.ancestor = ancestor;
	}

	// download the list of artifacts
	const { data: artifacts } = await get(
		`https://circleci.com/api/v1.1/project/github/${REPO}/${build_num}/artifacts`
	);

	// find the stats.json and chart.json URLs there and fail if not found
	const urls = ['stats.json', 'chart.json'].map(suffix => {
		const artifact = artifacts.find(a => a.url.endsWith(suffix));
		if (!artifact) {
			throw new Error(`${suffix} file missing in artifacts of ${REPO}/${build_num}`);
		}
		return artifact.url;
	});

	// Download stats.json and chart.json
	const [stats, chart] = await Promise.all(
		urls.map(url => timed(get(url).then(response => response.data), `Downloading ${url}`))
	);

	// Analyze the downloaded stats
	result.stats = analyzeBundle(push.sha, stats, chart);

	return result;
};
