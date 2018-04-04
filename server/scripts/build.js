const cmd = require('../cmd');

cmd('npm run preanalyze-bundles', {
	useShell: true,
	env: {
		NODE_ENV: 'production',
		CALYPSO_CLIENT: 'true',
	},
});
