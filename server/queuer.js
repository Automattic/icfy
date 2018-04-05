const { get } = require('axios');
const { log, sleep } = require('./utils');
const { getRepoEvents } = require('./github');
const db = require('./db');

const REPO = 'Automattic/wp-calypso';
const BRANCH = 'refs/heads/master';

function printPush(push) {
	return `${push.sha} at ${push.created_at} by ${push.author}: ${push.message}`;
}

function toPush(response) {
	return {
		sha: response.payload.head,
		created_at: response.created_at,
		author: response.actor.login,
		message: response.payload.commits[0].message.split('\n')[0],
		branch: 'master',
	};
}

async function fetchPushEvents(page = 1) {
	// issue the API request
	const response = await getRepoEvents(REPO, page);

	// extract the PushEvents to master
	const pushes = response.data
		.filter(push => push.type === 'PushEvent' && push.payload.ref === BRANCH)
		.map(toPush);

	log(`Retrieved ${pushes.length} pushes on page ${page}`);

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
			const [ lastPush ] = await db.getLastPush();
			const newPushes = await findNewPushesSince(lastPush);

			for (const push of newPushes) {
				await db.insertPush(push);
				log(`Queued new push: ${printPush(push)}`);
			}

			log(`Queued ${newPushes.length} new pushes`);
		} catch (error) {
			log('Error while checking for new pushes:', error);
		}

		await sleep(5 * 60 * 1000);
	}
}

pollForNewPushes().catch(console.error);
