exports.log = function(...args) {
	console.log(...args);
};

exports.sleep = function(ms) {
	return new Promise(r => setTimeout(r, ms));
};

// Measure and report how long a promise takes to resolve or reject
exports.timed = function(promise, label) {
	console.time(label);
	promise.finally(() => console.timeEnd(label));
	return promise;
};

exports.getPRNumber = function(push) {
	const prNumberMatch = /\(#([0-9]+)\)$/.exec(push.message);
	if (!prNumberMatch) {
		return null;
	}

	return prNumberMatch[1];
};
