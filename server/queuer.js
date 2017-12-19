const co = require('co');
const { get } = require('axios');
const db = require('./db');

const REPO = 'Automattic/wp-calypso';
const BRANCH = 'refs/heads/master';

function log(...args) {
	console.log(...args);
}

function sleep(ms) {
	return new Promise(r => setTimeout(r, ms));
}

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

const fetchPushEvents = co.wrap(function*(page = 1) {
	// issue the API request
	const url = `https://api.github.com/repos/${REPO}/events` + (page > 1 ? `?page=${page}` : '');
	const response = yield get(url);

	// extract the PushEvents to master
	const pushes = response.data
		.filter(push => push.type === 'PushEvent' && push.payload.ref === BRANCH)
		.map(toPush);

	log(`Retrieved ${pushes.length} pushes on page ${page}`);

	return pushes;
});

const findNewPushesSince = co.wrap(function*(lastPush) {
	log(`Searching for new pushes since: ${printPush(lastPush)}`);

	const newPushes = [];
	let page = 1;
	let lastPushFound = false;

	while (!lastPushFound) {
		if (page > 10) {
			log(`Didn't find the last push on last 10 pages`);
			break;
		}
		const pushes = yield fetchPushEvents(page++);
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
});

const pollForNewPushes = co.wrap(function*() {
	while (true) {
		try {
			const [ lastPush ] = yield db.getLastPush();
			const newPushes = yield findNewPushesSince(lastPush);

			for (const push of newPushes) {
				yield db.insertPush(push);
				log(`Queued new push: ${printPush(push)}`);
			}

			log(`Queued ${newPushes.length} new pushes`);
		} catch (error) {
			log('Error while checking for new pushes:', error);
		}

		yield sleep(5 * 60 * 1000);
	}
});

pollForNewPushes().catch(console.error);
