import React from 'react';

import Masterbar from './Masterbar';
import PushDetails from './PushDetails';

const PushView = props => {
	const { sha, prevSha } = props.match.params;

	return (
		<div className="layout">
			<Masterbar />
			<div className="content">
				<PushDetails sha={sha} prevSha={prevSha} />
			</div>
		</div>
	);
};

export default PushView;
