import React from 'react';

import Masterbar from './Masterbar';
import PushDetails from './PushDetails';

const PushView = props => {
	const searchParams = new URLSearchParams(props.location.search);
	const { params } = props.match;
	const sha = params.sha || searchParams.get('sha');
	const prevSha = params.prevSha || searchParams.get('prevSha');
	const size = searchParams.get('size') || 'gzip_size';

	return (
		<div className="layout">
			<Masterbar />
			<div className="content">
				<PushDetails sha={sha} prevSha={prevSha} size={size}/>
			</div>
		</div>
	);
};

export default PushView;
