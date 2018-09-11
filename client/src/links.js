import React from 'react';
import { Link } from 'react-router-dom';

function pathJoin(...parts) {
	return parts.reduce((joined, part) => (!part ? joined : joined + '/' + part));
}

export const PushLink = ({ sha, prevSha, len }) => {
	const displaySha = len ? sha.slice(0, len) : sha;
	return <Link to={pathJoin(`/push/${sha}`, prevSha)}>{displaySha}</Link>;
};

export const GitHubLink = ({ sha }) => (
	<a href={`https://github.com/Automattic/wp-calypso/commit/${sha}`}>github</a>
);
