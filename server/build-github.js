const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const rimraf = require('rimraf');
const _ = require('lodash');
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

async function downloadArtifact(artifactId, workDir, filename) {
	log(`Downloading archive for artifact ID ${artifactId}`);
	const zipStream = await gh.getActionRunArtifactArchiveStream(REPO, artifactId);

	const archiveFile = path.join(workDir, filename);
	const fileStream = fs.createWriteStream(archiveFile);
	zipStream.data.pipe(fileStream);

	await new Promise((resolve, reject) => {
		fileStream.on('close', resolve);
		fileStream.on('error', reject);
	});
}

function unzip(workDir, filename) {
	return new Promise((resolve, reject) => {
		const proc = spawn('unzip', [filename], {
			cwd: workDir,
			stdio: 'ignore',
		});

		proc.on('close', (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(`unzip exited with code ${code}`);
			}
		});

		proc.on('error', (err) => reject(`unzip failed to execute: ${err}`));
	});
}

async function parseJson(workDir, filename) {
	return JSON.parse(await fs.promises.readFile(path.join(workDir, filename)));
}

function cleanup(workDir) {
	return new Promise((resolve) =>
		rimraf(workDir, (err) => {
			if (err) return reject(err);
			resolve();
		})
	);
}

async function processBuild(buildNum) {
	const workDir = String(buildNum);

	const result = {
		stats: null,
		chart: null,
	};

	try {
		log(`creating working directory for build number ${buildNum}`);
		await fs.promises.mkdir(workDir);

		// get the artifact info for the given build and extract the ZIP download URL
		log(`Downloading artifact list for build number ${buildNum}`);
		const artifacts = await timed(downloadArtifactList(buildNum), 'downloadArtifactList');
		if (!artifacts) {
			return null;
		}

		const icfyArtifact = _.find(artifacts.artifacts, { name: 'icfy' });
		if (!icfyArtifact) {
			log(`No ICFY stats in artifact list of GitHub Action run ${REPO}/${buildNum}`);
			return null;
		}

		log(`Downloading archive for ${buildNum}, artifact ID ${icfyArtifact.id}`);
		await timed(downloadArtifact(icfyArtifact.id, workDir, 'archive.zip'), 'downloadArtifact');

		log(`Extracting archive for ${buildNum}, artifact ID ${icfyArtifact.id}`);
		await timed(unzip(workDir, 'archive.zip'), 'unzip');

		log('Parsing stats.json');
		result.stats = await timed(parseJson(workDir, 'stats.json'), 'parseStats');

		log('Parsing chart.json');
		result.chart = await timed(parseJson(workDir, 'chart.json'), 'parseChart');

		log(`Finished reading and extracting archive for artifact ID ${icfyArtifact.id}`);
	} catch (error) {
		log(`could not download and extract archive for build number ${buildNum}:`, error);
	} finally {
		await cleanup(workDir);
	}

	if (!result.stats || !result.chart) {
		return null;
	}

	return result;
}

module.exports = processBuild;
