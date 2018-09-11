const { spawn, exec } = require('child_process');
const { log } = require('./utils');

function logger(stream, prefix) {
	let buffer = '';

	stream.on('data', function(d) {
		buffer += d;
		while (1) {
			let newLine = buffer.indexOf('\n');
			if (newLine === -1) {
				break;
			}
			const line = buffer.substring(0, newLine);
			buffer = buffer.substring(newLine + 1);
			log(prefix + line);
		}
	});

	stream.on('end', function() {
		if (buffer.length > 0) {
			log(prefix + buffer);
			buffer = '';
		}
	});
}

function startProc(cmdline, env, useShell) {
	if (useShell) {
		return exec(cmdline, { env });
	}

	const [command, ...args] = cmdline.split(' ');
	return spawn(command, args, { env });
}

function cmd(cmdline, options = {}) {
	return new Promise((resolve, reject) => {
		log(`Executing: ${cmdline} in ${process.cwd()}`);
		env = Object.assign({}, process.env, options.env);
		const proc = startProc(cmdline, env, options.useShell);

		let stdout;
		if (options.returnStdout) {
			stdout = '';
			proc.stdout.on('data', data => (stdout += data));
		}

		logger(proc.stdout, '  out> ');
		logger(proc.stderr, '  err> ');

		proc.on('close', code => {
			if (code === 0) {
				resolve(options.returnStdout ? stdout.trim() : code);
			} else {
				reject(`${cmdline} exited with code ${code}`);
			}
		});

		proc.on('error', err => reject(`${cmdline} failed to execute: ${err}`));
	});
}

module.exports = cmd;
