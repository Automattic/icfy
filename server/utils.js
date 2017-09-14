exports.log = function(...args) {
	console.log(...args);
};

exports.sleep = function(ms) {
	return new Promise(r => setTimeout(r, ms));
};
