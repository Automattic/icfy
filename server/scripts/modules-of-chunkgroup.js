const { readFileSync } = require('fs');

const statsFilename = 'stats.json';
const statsData = JSON.parse(readFileSync(statsFilename));

const chartFilename = 'chart.json';
const chartData = JSON.parse(readFileSync(chartFilename));

const groupName = process.argv[2];

const chunksInGroup = statsData.namedChunkGroups[groupName].chunks;

console.log(`chunks in ${groupName}:`);
for (const chunk of chunksInGroup) {
	console.log(`  ${chunk}`);
}

for (const chunk of chunksInGroup) {
	listModulesInGroup(chunk, [chunk]);
}

function listModulesInGroup(name, chunks) {
	const modules = [];

	function listModules(node) {
		if (node.groups) {
			for (const subNode of node.groups) {
				listModules(subNode);
			}
		} else if (node.path) {
			modules.push(node.path);
		} else {
			throw new Error('Node has neither .groups or .path: ' + node.label);
		}
	}

	for (const chunk of chartData) {
		const [chunkName] = chunk.label.split('.');
		if (!chunks.includes(chunkName)) {
			continue;
		}

		listModules(chunk);
	}

	modules.sort();

	console.log(`modules in ${name}: ${ modules.length}`);
	for (const mod of modules) {
		console.log('  ' + mod);
	}
}
