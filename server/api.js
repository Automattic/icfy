const _ = require('lodash');
const express = require('express');
const nconf = require('nconf');
const bodyParser = require('body-parser');
const db = require('./db');

const port = 5000;
const app = express();

app.use(cors);
app.use(bodyParser.json());

app.get('/chunks', getChunks);
app.get('/chart', getChart);
app.get('/groupchart', getChunkGroupChart);
app.get('/push', getPush);
app.post('/push', insertPush);
app.get('/pushes', getPushes);
app.get('/pushstats', getPushStats);
app.get('/delta', getPushDelta);
app.get('/pushlog', getPushLog);
app.post('/removepush', removePush);
app.get('/buildlog', getCircleBuildLog);
app.post('/submit-stats', submitStats);

app.listen(port, () => console.log('API service is running on port', port));

function cors(req, res, next) {
	res.append('Access-Control-Allow-Origin', '*');
	res.append('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.append('Access-Control-Allow-Headers', 'content-type');
	next();
}

const reportError = res => error => {
	console.error(error);
	res.status(500).send('Internal Error');
};

function getChunks(req, res) {
	db.getKnownChunks()
		.then(chunks => res.json({ chunks }))
		.catch(reportError(res));
}

function getChart(req, res) {
	const { period, chunk, branch } = req.query;

	db.getChartData(period, chunk, branch)
		.then(data => res.json({ data }))
		.catch(reportError(res));
}

function getChunkGroupChart(req, res) {
	const { period, chunks, loadedChunks, branch } = req.query;

	db.getChunkGroupChartData(period, chunks, loadedChunks, branch)
		.then(data => res.json({ data }))
		.catch(reportError(res));
}

function getPush(req, res) {
	const { sha } = req.query;

	db.getPush(sha)
		.then(([push = null]) => res.json({ push }))
		.catch(reportError(res));
}

function insertPush(req, res) {
	const push = req.body;

	if (!push) {
		res.status(500).json({ error: 'Missing POST body' });
	}

	if (!push.branch || push.branch === 'master') {
		res.status(500).json({ error: 'Invalid branch' });
		return;
	}

	db.insertPush(push)
		.then(() => res.json({}))
		.catch(reportError(res));
}

function getPushes(req, res) {
	const { branch } = req.query;

	db.getPushesForBranch(branch)
		.then(pushes => res.json({ pushes }))
		.catch(reportError(res));
}

function getPushStats(req, res) {
	const { sha } = req.query;

	db.getPushStats(sha)
		.then(stats => res.json({ stats }))
		.catch(reportError(res));
}

function getPushDelta(req, res) {
	const { first, second } = req.query;

	db.getPushDelta(first, second)
		.then(delta => res.json({ delta }))
		.catch(reportError(res));
}

function getPushLog(req, res) {
	const { count = 20, branch } = req.query;

	db.getPushLog(count, branch)
		.then(pushlog => res.json({ pushlog }))
		.catch(reportError(res));
}

function removePush(req, res) {
	const { sha } = req.body;

	db.removePush(sha)
		.then(() => res.json({}))
		.catch(reportError(res));
}

function getCircleBuildLog(req, res) {
	const { count = 20, branch } = req.query;

	db.getCircleBuildLog(count, branch)
		.then(buildlog => res.json({ buildlog }))
		.catch(reportError(res));
}

function submitStats(req, res) {
	const { secret } = req.query;
	if (secret !== nconf.get('circle:secret')) {
		console.log('bad secret in CircleCI webhook notification');
		res.status(500).send('Unauthenticated');
		return;
	}

	console.log('Received CircleCI webhook notification:', req.body);
	const build = req.body.payload;
	db.insertCircleBuild(build)
		.then(() => res.json({}))
		.catch(reportError(res));
}
