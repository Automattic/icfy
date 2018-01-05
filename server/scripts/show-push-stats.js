const { statsFromSlug } = require('./stats-from-slug');
const { printPushStatsTable } = require('./table');

const pushSlug = process.argv[2];

statsFromSlug(pushSlug)
	.then(pushStats => {
		const table = printPushStatsTable(pushStats);
		console.log(table);
	})
	.catch(console.error);
