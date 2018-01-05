const { statsFromSlug } = require('./stats-from-slug');
const { deltaFromStats } = require('../delta.js');
const { printDeltaTable } = require('./table');

const firstSlug = process.argv[2];
const secondSlug = process.argv[3];

bothStats = [firstSlug, secondSlug].map(statsFromSlug);
Promise.all(bothStats)
	.then(([firstStats, secondStats]) => {
		const delta = deltaFromStats(firstStats, secondStats);
		const deltaTable = printDeltaTable(delta);
		console.log(deltaTable);
	})
	.catch(console.error);
