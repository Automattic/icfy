import React from 'react';
import table from 'text-table';
import { getPushLog } from './api';
import Masterbar from './Masterbar';

class PushLogView extends React.Component {
	state = { pushlog: null };

	componentDidMount() {
		getPushLog().then(response => {
			const { pushlog } = response.data;
			this.setState({ pushlog });
		});
	}

	renderPushLog() {
		const { pushlog } = this.state;

		if (!pushlog) {
			return 'Loading…';
		}

		const tableData = [];
		tableData.push(['processed', 'branch', 'sha', 'author', 'message']);
		for (const push of pushlog) {
			tableData.push([
				push.processed ? '✓' : '',
				push.branch,
				push.sha.slice(0, 10),
				push.author,
				push.message,
			]);
		}

		return <div className="text-table">{table(tableData)}</div>;
	}

	render() {
		return (
			<div className="layout">
				<Masterbar />
				<div className="content">{this.renderPushLog()}</div>
			</div>
		);
	}
}

export default PushLogView;
