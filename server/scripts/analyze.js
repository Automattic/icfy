const _ = require('lodash');
const analyze = require('../analyze');

const { chunkGroups, chunkNames } = analyze({});

const getName = id => {
	const name = chunkNames[id][0];
	return name ? name : id;
};

const groupStats = _.mapValues(_.groupBy(chunkGroups, 'chunk'), siblings =>
	_.map(siblings, 'sibling')
);

_.forEach(groupStats, (siblings, chunk) =>
	console.log(`${getName(chunk)}: ${_.join(_.map(siblings, getName))}`)
);
