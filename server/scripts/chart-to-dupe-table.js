const { readFileSync } = require('fs');
const table = require('text-table');

const chartFilename = process.argv[2];

const chartData = JSON.parse(readFileSync(chartFilename));

const dupeMap = new Map();

function addDupe(chunkname, modulename) {
	const dupes = dupeMap.get(modulename) || [];
	dupes.push(chunkname);
	dupeMap.set(modulename, dupes);
}

function walkNode(chunkname, node, prefix) {
	if (!node.groups) {
		addDupe(chunkname, prefix);
		return;
	}

	for (group of node.groups) {
		walkNode(chunkname, group, `${prefix}/${group.label}`);
	}
}

for (chunk of chartData) {
	const [chunkname] = chunk.label.split('.');
	walkNode(chunkname, chunk, '');
}

const dupeEntries = [...dupeMap].filter(dupe => dupe[1].length > 1);
dupeEntries.sort((a, b) => b[1].length - a[1].length);

const tableData = [];
tableData.push(['count', 'module', 'chunks']);

for (const dupeEntry of dupeEntries) {
	const [modulename, chunklist] = dupeEntry;
	const count = chunklist.length;
	const inReader = chunklist.includes('reader');
	const inStats = chunklist.includes('stats');
	const inPostEditor = chunklist.includes('post-editor');
	tableData.push([count, modulename, chunklist.join(',')]);
}

console.log(table(tableData));
