const { readFileSync } = require('fs');

const chartFilename = process.argv[2];

const chartData = JSON.parse(readFileSync(chartFilename));

function walkNode(chunkname, node, prefix) {
	if (!node.groups) {
		console.log(`${chunkname}:${prefix}`);
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
