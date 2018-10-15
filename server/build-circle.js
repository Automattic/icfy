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

	const { ancestor, build_num } = circleBuild;

	// download the list of artifacts
	const { data: artifacts } = await get(
		`https://circleci.com/api/v1.1/project/github/${REPO}/${build_num}/artifacts`
	);

	// find the stats.json and chart.json URLs there and fail if not found
	const urls = ['stats.json', 'chart.json'].map(suffix => {
		const artifact = artifacts.find(a => a.url.endsWith(suffix));
		if (!artifact) {
			log(`${suffix} file missing in artifacts of ${REPO}/${build_num}`);
			return null;
		}
		return artifact.url;
	});

	// if both JSON files are not present, it's probably a race condition. Try again in a while
	if (!urls.every(Boolean)) {
		return null;
	}

	// Download stats.json and chart.json
	const [stats, chart] = await Promise.all(
		urls.map(url => timed(get(url).then(response => response.data), `Downloading ${url}`))
	);

	// Analyze the downloaded stats
	const result = {
		stats: analyzeBundle(push.sha, stats, chart),
	};

	// determine the ancestor
	if (ancestor && push.branch !== 'master' && !push.ancestor) {
		log(`ancestor of ${push.branch} (${push.sha}): [${ancestor}]`);
		result.ancestor = ancestor;
	}

	return result;
};
