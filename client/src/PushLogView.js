import React from 'react';
import { getPushLog, removePush } from './api';
import Masterbar from './Masterbar';

function Table({ data }) {
	const [header, ...rows] = data;

	return (
		<table className="table">
			<thead>
				<tr>{header.map(col => <th>{col}</th>)}</tr>
			</thead>
			<tbody>{rows.map(row => <tr>{row.map(col => <td>{col}</td>)}</tr>)}</tbody>
		</table>
	);
}

const handleRemovePush = event => removePush(event.target.dataset.sha);

const RemoveButton = ({ sha }) => (
	<button className="remove-button" data-sha={sha} onClick={handleRemovePush}>
		×
	</button>
);

class PushLogView extends React.Component {
	state = { pushlog: null };

	componentDidMount() {
		const searchParams = new URLSearchParams(this.props.location.search);
		const count = searchParams.get('count');

		getPushLog(count).then(response => {
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
			const processed = push.processed ? (
				'✓'
			) : (
				<span>
					no <RemoveButton sha={push.sha} />
				</span>
			);

			tableData.push([
				processed,
				push.branch,
				push.sha.slice(0, 10),
				push.author,
				push.message.slice(0, 80),
			]);
		}

		return <Table data={tableData} />;
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
