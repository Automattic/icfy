/*
 * Usage: node github-recent-pushes.js <page_count>
 * Fetch `page_count` recent pages of GitHub events feed for the repo
 * and print `PushEvent` and `CreateEvent` events.
 */
const { getRepoEvents } = require('../github');

const pages = Number(process.argv[2]) || 1;

function toPush(response) {
	return {
		sha: response.payload.head,
		created_at: response.created_at,
		author: response.actor.login,
		commitCount: response.payload.commits.length,
		ref: response.payload.ref,
	};
}

function isRelevantPush(response) {
	return response.type === 'PushEvent';
}

function printPush(push) {
	return `${push.sha}: ${push.ref} ${push.commitCount} commits`;
}

async function listPages() {
  console.log(`Retrieving ${pages} pages of GitHub pushes`);
	for (let page = 1; page <= pages; page++) {
		console.log(`Retrieving page ${page}`);
		const response = await getRepoEvents('Automattic/wp-calypso', page);
		const pushes = response.data.filter(isRelevantPush).map(toPush);

		console.log(`Retrieved ${pushes.length} pushes (out of ${response.data.length} events) on page ${page}:`);
		for (const push of pushes) {
			console.log(`  ${printPush(push)}`);
		}
    for (const ev of response.data) {
      if (ev.type === 'CreateEvent') {
        console.log(`Event: ${ev.type} ref=${ev.payload.ref}`);
      }
    }
	}
}

listPages().catch(console.error);
