const express = require('express');
const db = require('./db');

const port = 5000;
const app = express();

app.use(cors);
app.get('/chunks', getChunks);
app.get('/chart/:period/:chunk', getChart);
app.get('/push/:sha', getPush);
app.get('/delta/:size/:first/:second', getPushDelta);

app.listen(port, () => console.log('API service is running on port', port));

function cors(req, res, next) {
	res.append('Access-Control-Allow-Origin', '*');
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
	const { period, chunk } = req.params;

	db.getChartData(period, chunk)
		.then(data => data.slice(-200))
		.then(data => res.json({ data }))
		.catch(reportError(res));
}

function getPush(req, res) {
	const { sha } = req.params;

	db.getPush(sha)
		.then(([ push = null ]) => res.json({ push }))
		.catch(reportError(res))
}

function getPushDelta(req, res) {
	const { size, first, second } = req.params;

	db.getPushDelta(size, first, second)
		.then(delta => res.json({ delta }))
		.catch(reportError(res));
}
