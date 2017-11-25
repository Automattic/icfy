import React from 'react';

import Masterbar from './Masterbar';

const PushView = props => {
	const { sha, prevSha } = props.match.params;

	return (
		<div className="layout">
			<Masterbar />
			<div className="content">Push: {props.match.params.sha}</div>
		</div>
	);
};

export default PushView;
