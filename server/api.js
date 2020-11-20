const _ = require('lodash');
const express = require('express');
const nconf = require('nconf');
const bodyParser = require('body-parser');
const db = require('./db');

const port = 5000;
const app = express();

app.use(cors);
app.use(bodyParser.json({ limit: '2mb' }));

// API for frontend app
app.get('/chunks', getChunks);
app.get('/chunkgroups', getChunkGroups);
app.get('/chart', getChart);
app.get('/groupchart', getChunkGroupChart);
app.get('/push', getPush);
app.get('/pushes', getPushes);
app.get('/pushstats', getPushStats);
app.get('/delta', getPushDelta);
app.get('/pushlog', getPushLog);
app.get('/buildlog', getBuildLog);

// API for webhooks from CI (CircleCI and GitHub Actions)
app.post('/submit-stats', submitStats);
app.post('/submit-stats-failed', submitStatsFailed);

// API for webhooks from GitHub
app.post('/hooks-github', githubWebhook);

// Serve static assets with the React frontend
app.use(express.static('public'));

app.get('/p/*', function (req, res) {
	res.sendFile('public/index.html', { root: __dirname });
});

app.listen(port, () => console.log('API service is running on port', port));

function cors(req, res, next) {
	res.append('Access-Control-Allow-Origin', '*');
	res.append('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.append('Access-Control-Allow-Headers', 'content-type');
	next();
}

const reportError = (res) => (error) => {
	console.error(error);
	res.status(500).send('Internal Error');
};

function getChunks(req, res) {
	db.getKnownChunks()
		.then((chunks) => res.json({ chunks }))
		.catch(reportError(res));
}

function getChunkGroups(req, res) {
	db.getKnownChunkGroups()
		.then((chunkGroups) => res.json({ chunkGroups }))
		.catch(reportError(res));
}

function getChart(req, res) {
	const { period, chunk, branch } = req.query;

	db.getChartData(period, chunk, branch)
		.then((data) => res.json({ data }))
		.catch(reportError(res));
}

function getChunkGroupChart(req, res) {
	const { period, chunks, loadedChunks, branch } = req.query;

	db.getChunkGroupChartData(period, chunks, loadedChunks, branch)
		.then((data) => res.json({ data }))
		.catch(reportError(res));
}

function getPush(req, res) {
	const { sha } = req.query;

	db.getPush(sha)
		.then(([push = null]) => res.json({ push }))
		.catch(reportError(res));
}

function getPushes(req, res) {
	const { branch } = req.query;

	db.getPushesForBranch(branch)
		.then((pushes) => res.json({ pushes }))
		.catch(reportError(res));
}

function getPushStats(req, res) {
	const { sha } = req.query;

	db.getPushStats(sha)
		.then((stats) => res.json({ stats }))
		.catch(reportError(res));
}

function getPushDelta(req, res) {
	const { first, second } = req.query;

	db.getPushDelta(first, second)
		.then((delta) => res.json(delta))
		.catch(reportError(res));
}

function getPushLog(req, res) {
	const { count = 20, branch } = req.query;

	db.getPushLog(count, branch)
		.then((pushlog) => res.json({ pushlog }))
		.catch(reportError(res));
}

function getBuildLog(req, res) {
	const { count = 20, branch, from = 'circle' } = req.query;

	db.getCIBuildLog(count, branch, from)
		.then((buildlog) => res.json({ buildlog }))
		.catch(reportError(res));
}

function verifyWebhookSecret(req, res) {
	const { secret } = req.query;
	if (secret === nconf.get('circle:secret')) {
		return true;
	}

	console.log('bad secret in CI webhook notification');
	res.status(500).send('Unauthenticated');
	return false;
}

function submitStats(req, res) {
	if (!verifyWebhookSecret(req, res)) {
		return;
	}

	const { from = 'circle' } = req.query;
	console.log('Received CI success webhook notification:', from, req.body);
	const build = { ...req.body.payload, success: true };
	db.insertCIBuild(from, build)
		.then(() => res.json({}))
		.catch(reportError(res));
}

function submitStatsFailed(req, res) {
	if (!verifyWebhookSecret(req, res)) {
		return;
	}

	const { from = 'circle' } = req.query;
	console.log('Received CI failure webhook notification:', from, req.body);
	const build = { ...req.body.payload, success: false };
	db.insertCIBuild(from, build)
		.then(() => res.json({}))
		.catch(reportError(res));
}

function printPush(push) {
	return `${push.sha} in ${push.branch} at ${push.created_at} by ${push.author}: ${push.message}`;
}

function toUTC(date) {
	return new Date(date).toISOString();
}

function fromPR(body) {
	return {
		sha: body.pull_request.head.sha,
		branch: body.pull_request.head.ref,
		message: `${body.pull_request.title} (#${body.pull_request.number})`,
		author: body.sender.login,
		created_at: toUTC(body.pull_request.updated_at),
	};
}

function fromPush(body) {
	return {
		sha: body.head_commit.id,
		branch: body.ref.replace(/^refs\/heads\//, ''),
		message: _.first(body.head_commit.message.split('\n')),
		author: body.pusher.name,
		created_at: toUTC(body.head_commit.timestamp),
	};
}

async function queuePush(push) {
	const inserted = await db.insertPush(push);
	if (inserted) {
		console.log(`Queued new push: ${printPush(push)}`);
	} else {
		console.log(`Push with the same SHA already present: ${printPush(push)}`);
	}
}

async function githubWebhook(req, res) {
	const type = req.get('X-GitHub-Event');
	const id = req.get('X-GitHub-Delivery');
	const body = req.body;

	// PR created or updated
	if (type === 'pull_request' && (body.action === 'opened' || body.action === 'synchronize')) {
		console.log('Received GitHub webhook:', id, type, body.action);
		await queuePush(fromPR(body));
	}

	// push to main branch
	if (
		type === 'push' &&
		(body.ref === 'refs/heads/master' || body.ref === 'refs/heads/trunk') &&
		body.head_commit
	) {
		console.log('Received GitHub webhook:', id, type);
		await queuePush(fromPush(body));
	}

	res.json({});
}
