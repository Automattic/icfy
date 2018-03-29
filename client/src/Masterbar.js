import React from 'react';
import { Link } from 'react-router-dom';
import * as config from './config.json';

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
		<Link className="title" to="/">{ config.title }</Link>
		<span className="tagline">Tracking Webpack bundle sizes since 2017</span>
		<GitHubButton />
	</div>
);

export default Masterbar;
