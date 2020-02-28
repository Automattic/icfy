const _ = require('lodash');
const { get } = require('axios');
const unzipper = require('unzipper');
const { log, timed } = require('./utils');
const gh = require('./github');

const REPO = 'Automattic/wp-calypso';

async function downloadArtifactList(buildNum) {
	try {
		const response = await gh.getActionRunArtifacts(REPO, buildNum);
		return response.data;
	} catch (error) {
		log(`could not download artifacts of GitHub Action run ${REPO}/${buildNum}:`, error);
		return null;
	}
}

async function readEntry(entry) {
	log('Reading file', entry.path);
	const data = await entry.buffer();
	log('Parsing file', entry.path);
	const json = JSON.parse(data);
	log('Finished reading and parsing file', entry.path);
	return json;
}

async function processBuild(buildNum) {
	// get the artifact info for the given build and extract the ZIP download URL
	log(`Downloading artifact list for build number ${buildNum}`);
	const artifacts = await downloadArtifactList(buildNum);
	if (!artifacts) {
		return null;
	}

	const icfyArtifact = _.find(artifacts.artifacts, { name: 'icfy' });
	if (!icfyArtifact) {
		log(`No ICFY stats in artifact list of GitHub Action run ${REPO}/${buildNum}`);
		return null;
	}

	const result = {
		stats: null,
		chart: null,
	};

	// create the ZIP download stream
	try {
		log(`Downloading archive for ${REPO}/${buildNum}, artifact ID ${icfyArtifact.id}`);
		const zipResponse = await gh.getActionRunArtifactArchiveStream(REPO, icfyArtifact.id);

		log(`Reading and extracting archive for ${REPO}/${buildNum}, artifact ID ${icfyArtifact.id}`);
		const zipStream = zipResponse.data;

		// extract the ZIP contents
		const zip = zipStream.pipe(unzipper.Parse());
		zip.on('entry', async entry => {
			const { path } = entry;
			switch (path) {
				case 'stats.json':
					result.stats = await readEntry(entry);
					break;
				case 'chart.json':
					result.chart = await readEntry(entry);
					break;
				default:
					log('Ignoring unexpected file in the artifact archive', path);
					entry.autodrain();
			}
		});
		log('waiting to finish');
		await zip.promise();
		log(`Finished reading and extracting archive for artifact ID ${icfyArtifact.id}`);
	} catch (error) {
		log(`could not download and extract archive for artifact ID ${icfyArtifact.id}:`, error);
	}

	if (!result.stats || !result.chart) {
		return null;
	}

	return result;
}

module.exports = processBuild;
