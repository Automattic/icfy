import React from 'react';
import { getPushLog, removePush } from './api';
import Masterbar from './Masterbar';
import { PushLink, GitHubLink } from './links';

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

const RemoveButton = ({ sha, onClick }) => (
	<button className="remove-button" data-sha={sha} onClick={onClick}>
		🗑
	</button>
);

class PushLogView extends React.Component {
	state = { pushlog: null, removingPushSha: null };

	componentDidMount() {
		this.loadPushLog();
	}

	async loadPushLog() {
		const searchParams = new URLSearchParams(this.props.location.search);
		const count = searchParams.get('count');

		const response = await getPushLog(count);
		this.setState({ pushlog: response.data.pushlog });
	}

	handleRemovePush = async event => {
		const { sha } = event.target.dataset;
		this.setState({ removingPushSha: sha });
		await removePush(sha);
		this.setState({ removingPushSha: null, pushlog: null });
		await this.loadPushLog();
	};

	renderProcessed(push) {
		if (push.processed) {
			return '👍';
		}

		if (push.branch === 'master') {
			return 'waiting…';
		}

		if (this.state.removingPushSha === push.sha) {
			return 'removing…';
		}

		return (
			<span>
				waiting… (<RemoveButton sha={push.sha} onClick={this.handleRemovePush} />)
			</span>
		);
	}

	renderSha(push) {
		return (
			<span>
				{push.processed ? <PushLink sha={push.sha} len={10} /> : push.sha.slice(0, 10)}{' '}
				<GitHubLink sha={push.sha} />
			</span>
		);
	}

	renderPushLog() {
		const { pushlog } = this.state;

		if (!pushlog) {
			return 'Loading…';
		}

		const tableData = [];
		tableData.push(['processed', 'branch', 'sha', 'created_at', 'author', 'message']);
		for (const push of pushlog) {
			tableData.push([
				this.renderProcessed(push),
				push.branch,
				this.renderSha(push),
				push.created_at,
				push.author,
				push.message.slice(0, 80)
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
