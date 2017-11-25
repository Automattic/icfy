import React from 'react';

const GitHubButton = () => (
	<span className="button">
		<a
			className="github-button"
			href="https://github.com/jsnajdr/icfy"
			aria-label="View sources on GitHub"
		>
			GitHub
		</a>
	</span>
);

const Masterbar = () => (
	<div className="masterbar">
		<span className="title">Is Calypso fast yet?</span>
		<span className="tagline">Tracking Webpack bundle sizes since 2017</span>
		<GitHubButton />
	</div>
);

export default Masterbar;
