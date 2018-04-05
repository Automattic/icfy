const _ = require('lodash');
const analyze = require('../analyze');

const { chunkGroups } = analyze({});

const groupStats = _.mapValues(_.groupBy(chunkGroups, 'chunk'), siblings =>
	_.map(siblings, 'sibling')
);

_.forEach(groupStats, (siblings, chunk) => {
	console.log(chunk);
	for (const sibling of siblings) {
		console.log(`  ${sibling}`);
	}
});
