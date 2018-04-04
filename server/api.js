const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
const github = require('./github');

const port = 5000;
const app = express();

app.use(cors);
app.use(bodyParser.json());

app.get('/chunks', getChunks);
app.get('/chart', getChart);
app.get('/groupchart', getChunkGroupChart);
app.get('/push', getPush);
app.get('/push/:sha', getPush);
app.post('/push', insertPush);
app.get('/pushstats', getPushStats);
app.get('/delta', getPushDelta);
app.get('/pushlog', getPushLog);
app.post('/removepush', removePush);
app.get('/branches', getBranches);
app.get('/branch', getBranch);

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
	db
		.getKnownChunks()
		.then(chunks => res.json({ chunks }))
		.catch(reportError(res));
}

function getChart(req, res) {
	const { period, chunk, branch } = req.query;

	db
		.getChartData(period, chunk, branch)
		.then(data => res.json({ data }))
		.catch(reportError(res));
}

function getChunkGroupChart(req, res) {
	const { period, chunks, loadedChunks, branch } = req.query;

	db
		.getChunkGroupChartData(period, chunks, loadedChunks, branch)
		.then(data => res.json({ data }))
		.catch(reportError(res));
}

function getPush(req, res) {
	const { sha } = _.defaults(req.params, req.query);

	db
		.getPush(sha)
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

	db
		.insertPush(push)
		.then(() => res.json({}))
		.catch(reportError(res));
}

function getPushStats(req, res) {
	const { sha } = req.query;

	db
		.getPushStats(sha)
		.then(stats => res.json({ stats }))
		.catch(reportError(res));
}

function getPushDelta(req, res) {
	const { first, second } = _.defaults(req.params, req.query);

	db
		.getPushDelta(first, second)
		.then(delta => res.json({ delta }))
		.catch(reportError(res));
}

function getPushLog(req, res) {
	const { count = 20 } = req.query;

	db
		.getPushLog(count)
		.then(pushlog => res.json({ pushlog }))
		.catch(reportError(res));
}

function removePush(req, res) {
	const { sha } = req.query;

	db
		.removePush(sha)
		.then(() => res.json({}))
		.catch(reportError(res));
}

function getBranches(req, res) {
	github
		.getBranches()
		.then(response => {
			const branches = response.data.map(branch => branch.ref.replace(/^refs\/heads\//, ''));
			res.json({ branches });
		})
		.catch(reportError(res));
}

function getBranch(req, res) {
	const { branch } = req.query;

	github
		.getBranch(branch)
		.then(response => res.json({ branch: response.data }))
		.catch(reportError(res));
}
