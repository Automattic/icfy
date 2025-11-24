const fs = require('fs');
const streamJson = require('stream-json');

function matchingProp(name) {
	switch (name.length) {
		case 1:
			return name[0] === 'chunks' || name[0] === 'namedChunkGroups';
		case 2:
			return (
				(name[0] === 'chunks' && (name[1] === 'id' || name[1] === 'names')) ||
				name[0] === 'namedChunkGroups'
			);
		case 3:
			return name[0] === 'namedChunkGroups' && name[2] === 'chunks';
		default:
			return false;
	}
}

function parseStats(filename) {
	const inputStream = fs.createReadStream(filename, { encoding: 'utf8' });
	const jsonStream = streamJson.parser();
	inputStream.pipe(jsonStream);

	const outputStack = [];
	const propStack = [];
	let shouldStore = false;
	let output = undefined;

	function store(value) {
		if (outputStack.length === 0) {
			output = value;
			return;
		}

		const target = outputStack.at(-1);
		if (Array.isArray(target)) {
			if (shouldStore) {
				target.push(value);
			}
		} else {
			const prop = propStack.pop();
			if (shouldStore) {
				target[prop] = value;
			}
			shouldStore = matchingProp(propStack);
		}
	}

	jsonStream.on('data', ({ name, value }) => {
		switch (name) {
			case 'keyValue': {
				propStack.push(value);
				shouldStore = matchingProp(propStack);
				break;
			}
			case 'startObject': {
				outputStack.push({});
				break;
			}
			case 'startArray': {
				outputStack.push([]);
				break;
			}
			case 'endObject':
			case 'endArray': {
				store(outputStack.pop());
				break;
			}
			case 'stringValue':
			case 'numberValue': {
				store(value);
				break;
			}
			case 'nullValue': {
				store(null);
				break;
			}
			case 'trueValue': {
				store(true);
				break;
			}
			case 'falseValue': {
				store(false);
				break;
			}
			default:
				break;
		}
	});

	return new Promise((resolve, reject) => {
		jsonStream.on('end', () => {
			resolve(output);
		});
		jsonStream.on('error', (error) => {
			reject(error);
		});
		inputStream.on('error', (error) => {
			reject(error);
		});
	});
}

module.exports = parseStats;
