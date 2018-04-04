const { spawn, exec } = require('child_process');
const { log } = require('./utils');

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
