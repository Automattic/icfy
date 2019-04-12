import React from 'react';
import printDeltaTable from './delta-table';

const DeltaTable = ({ delta }) => {
	if (!delta) {
		return '...';
	} else if (delta.length === 0) {
		return 'no changes in production JS';
	} else {
		return (
			<div className="text-table">
				{printDeltaTable(delta, {
					hideTinyChanges: true,
					printTinyChangesNotice: true,
					printTotal: true,
				})}
			</div>
		);
	}
};

const Delta = ({ delta, type }) => {
	if (!delta) {
		return <div className="push">...</div>;
	}

	const title = type === 'groups' ? 'Chunk Groups Delta:' : 'Chunks Delta:';
	const data = type === 'groups' ? delta.groups : delta.chunks;

	return (
		<div className="push">
			<b>{title}</b>
			<br />
			<DeltaTable delta={data} />
		</div>
	);
};

export default Delta;
