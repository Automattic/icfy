const _ = require('lodash');
const { log, sleep } = require('./utils');
const { getRepoEvents } = require('./github');
const db = require('./db');

const REPO = 'Automattic/wp-calypso';

function printPush(push) {
	return `${push.sha} in ${push.branch} at ${push.created_at} by ${push.author}: ${push.message}`;
}

function toPush(response) {
	return {
		sha: response.payload.head,
		created_at: response.created_at,
		author: response.actor.login,
		message: _.first(_.last(response.payload.commits).message.split('\n')),
		branch: response.payload.ref.replace(/^refs\/heads\//, ''),
	};
}

function isRelevantPush(response) {
	// filter PushEvents that have expected ref (branch) name and at least one commit.
	// Commitless pushes are usually tags -- not interesting.
	return (
		response.type === 'PushEvent' &&
		response.payload.ref.startsWith('refs/heads/') &&
		response.payload.commits.length > 0
	);
}

async function fetchPushEvents(page = 1) {
	// issue the API request
	const response = await getRepoEvents(REPO, page);

	// extract the relevant info from relevant events
	const pushes = response.data.filter(isRelevantPush).map(toPush);

	log(`Retrieved ${pushes.length} pushes on page ${page}:`);
	for (const push of pushes) {
		log(`  ${printPush(push)}`);
	}

	return pushes;
}

async function findNewPushesSince(lastPush) {
	log(`Searching for new pushes since: ${printPush(lastPush)}`);

	const newPushes = [];
	let page = 1;
	let lastPushFound = false;

	while (!lastPushFound) {
		if (page > 10) {
			log(`Didn't find the last push on last 10 pages`);
			break;
		}
		const pushes = await fetchPushEvents(page++);
		for (const push of pushes) {
			if (push.sha === lastPush.sha) {
				log(`Reached last known push: ${printPush(push)}`);
				lastPushFound = true;
				break;
			}

			newPushes.push(push);
			log(`Found new push: ${printPush(push)}`);
		}
	}

	return newPushes.reverse();
}

async function pollForNewPushes() {
	while (true) {
		try {
			const [lastPush] = await db.getLastPush();
			const newPushes = await findNewPushesSince(lastPush);

			for (const push of newPushes) {
				const inserted = await db.insertPush(push);
				if (inserted) {
					log(`Queued new push: ${printPush(push)}`);
				} else {
					log(`Push with the same SHA already present: ${printPush(push)}`);
				}
			}

			log(`Queued ${newPushes.length} new pushes`);
		} catch (error) {
			log('Error while checking for new pushes:', error);
		}

		await sleep(5 * 60 * 1000);
	}
}

pollForNewPushes().catch(console.error);
