const { get } = require('axios');
const { log, timed } = require('./utils');

const REPO = 'Automattic/wp-calypso';

async function downloadArtifactList(buildNum) {
	try {
		const url = `https://circleci.com/api/v1.1/project/github/${REPO}/${buildNum}/artifacts`;
		const response = await get(url);
		return response.data;
	} catch (error) {
		log(`could not download artifacts of ${REPO}/${buildNum}:`, error);
		return null;
	}
}

async function downloadArtifact(url) {
	try {
		const response = await get(url);
		return response.data;
	} catch (error) {
		log(`could not download artifact file ${url}:`, error);
		return null;
	}
}

async function processBuild(buildNum) {
	// download the list of artifacts
	const artifacts = await downloadArtifactList(buildNum);
	if (!artifacts) {
		return null;
	}

	// find the stats.json and chart.json URLs there and fail if not found
	const urls = ['stats.json', 'chart.json'].map(suffix => {
		const artifact = artifacts.find(a => a.url.endsWith(suffix));
		if (!artifact) {
			log(`${suffix} file missing in artifacts of ${REPO}/${buildNum}`);
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
		urls.map(url => timed(downloadArtifact(url), `Downloading ${url}`))
	);

	if (!stats || !chart) {
		return null;
	}

	return { stats, chart };
};

module.exports = processBuild;
