const _ = require('lodash');
const { log } = require('./utils');
const db = require('./db');
const gh = require('./github');
const printDeltaTable = require('./delta-table');

const REPO = 'Automattic/wp-calypso';
const WATERMARK = 'c52822';
const COMMENT_USER = 'matticbot';

function groupByArea(deltas) {
	return _.groupBy(deltas, delta => {
		if (delta.name.startsWith('moment-locale-')) {
			return 'moment-locale';
		}
		if (delta.name.startsWith('async-load-')) {
			return 'async-load';
		}
		if (['build', 'domainsLanding'].includes(delta.name)) {
			return 'entry';
		}
		if (delta.name === 'manifest') {
			return 'runtime';
		}
		if (delta.name === 'style.css') {
			return 'style.css';
		}
		return 'section';
	});
}

const AREAS = [
	{
		id: 'runtime',
		title: 'Webpack Runtime',
		desc:
			'webpack runtime for loading modules. Is downloaded and parsed every time the app is loaded.',
	},
	{
		id: 'entry',
		title: 'App Entrypoints',
		desc:
			'Common code that is always downloaded and parsed every time the app is loaded, no matter which route is used.',
	},
	{
		id: 'style.css',
		title: 'Legacy SCSS Stylesheet',
		desc: 'The monolithic CSS stylesheet that is downloaded on every app load.',
		desc_inc:
			'This PR increases the size of the stylesheet, which is a bad news. ' +
			'Please consider migrating the CSS styles you modified to webpack imports.',
		desc_dec: 'Thanks for making the stylesheet smaller in this PR!',
	},
	{
		id: 'section',
		title: 'Sections',
		desc:
			'Sections contain code specific for a given set of routes. Is downloaded and parsed only when a particular route is navigated to.',
	},
	{
		id: 'async-load',
		title: 'Async-loaded Components',
		desc:
			'React components that are loaded lazily, when a certain part of UI is displayed for the first time.',
	},
	{
		id: 'moment-locale',
		title: 'Moment.js Locales',
		desc:
			'Locale data for moment.js. Unless you are upgrading the moment.js library, changes in these chunks are suspicious.',
	},
];

function watermarkString(watermark) {
	return `icfy-watermark: ${watermark}`;
}

async function statsMessage(push) {
	const delta = await db.getPushDelta(push.ancestor, push.sha);
	const byArea = groupByArea(delta.groups);

	const message = [];

	message.push(`<!-- ${watermarkString(WATERMARK)} -->`);
	if (_.isEmpty(byArea)) {
		message.push(
			"This PR does not affect the size of JS and CSS bundles shipped to the user's browser."
		);
	} else {
		message.push(
			"Here is how your PR affects size of JS and CSS bundles shipped to the user's browser:"
		);

		for (const area of AREAS) {
			const areaDelta = byArea[area.id];
			if (!areaDelta) {
				continue;
			}

			message.push('');
			message.push(`**${area.title}**`);
			message.push(area.desc);

			if (_.every(areaDelta, delta => _.every(delta.deltaSizes, size => size > 0))) {
				message.push(area.desc_inc);
			} else if (_.every(areaDelta, delta => _.every(delta.deltaSizes, size => size < 0))) {
				message.push(area.desc_dec);
			}

			message.push('```');
			message.push(printDeltaTable(areaDelta));
			message.push('```');
		}

		message.push('');
		message.push(
			'**Parsed Size:** Uncompressed size of the JS and CSS files. This much code needs to be parsed and stored in memory.'
		);
		message.push(
			'**Gzip Size:** Compressed size of the JS and CSS files. This much data needs to be downloaded over network.'
		);
	}
	message.push('');
	message.push(
		'Generated by performance advisor bot at [iscalypsofastyet.com](http://iscalypsofastyet.com).'
	);

	return message.join('\n');
}

function getPRNumber(push) {
	const prNumberMatch = /\(#([0-9]+)\)$/.exec(push.message);
	if (!prNumberMatch) {
		return null;
	}

	return prNumberMatch[1];
}

async function getOurPRCommentIDs(repo, prNum) {
	const prComments = await gh.getPRComments(repo, prNum);
	return prComments.data
		.filter(comment => comment.user.login === COMMENT_USER)
		.filter(comment => comment.body.includes(watermarkString(WATERMARK)))
		.map(comment => comment.id);
}

const AUTHOR_SHORTLIST = ['renovate[bot]', 'jsnajdr', 'blowery', 'flootr', 'sgomes'];

module.exports = async function commentOnGithub(sha) {
	const [push] = await db.getPush(sha);

	if (!push) {
		log('Cannot find push to comment on:', sha);
		return;
	}

	if (push.branch === 'master' || !push.ancestor || !AUTHOR_SHORTLIST.includes(push.author)) {
		log('Push not eligible for comment:', sha);
		return;
	}

	const prNumber = getPRNumber(push);
	if (prNumber === null) {
		log('Cannot find a PR number on the push:', push.sha, push.message);
	}

	log('Commenting on PR', prNumber);

	const [firstComment, ...otherComments] = await getOurPRCommentIDs(REPO, prNumber);

	const message = await statsMessage(push);

	if (!firstComment) {
		log('Posting first comment on PR', prNumber);
		await gh.createPRComment(REPO, prNumber, message);
	} else {
		log('Updating existing comment on PR', prNumber, firstComment);
		await gh.editPRComment(REPO, firstComment, message);
	}

	for (const otherComment of otherComments) {
		log('Removing outdated comment on PR', prNumber, otherComment);
		await gh.deletePRComment(REPO, otherComment);
	}

	log('Commented on PR', prNumber);
};