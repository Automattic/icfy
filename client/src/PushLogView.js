import React from 'react';
import { getPushLog, removePush } from './api';
import Masterbar from './Masterbar';
import CommitMessage from './CommitMessage';
import FormatDate from './FormatDate';
import Select from './Select';
import { PushLink, GitHubLink } from './links';

function Table({ header, rows }) {
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

const DEFAULT_COUNT = '20';
const COUNTS = [
	{ value: '20', name: 'last 20 pushes' },
	{ value: '50', name: 'last 50 pushes' },
	{ value: '100', name: 'last 100 pushes' },
	{ value: '200', name: 'last 200 pushes' },
];

class PushLogView extends React.Component {
	constructor(props) {
		super(props);

		const searchParams = new URLSearchParams(this.props.location.search);
		const count = searchParams.get('count') || DEFAULT_COUNT;

		this.state = { count, pushlog: null, removingPushSha: null };
	}

	componentDidMount() {
		this.loadPushLog();
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevState.count !== this.state.count) {
			this.loadPushLog();
		}
	}

	async loadPushLog() {
		const response = await getPushLog(this.state.count);
		this.setState({ pushlog: response.data.pushlog });
	}

	changeCount = event => {
		const count = event.target.value;
		this.props.history.push({ search: count !== DEFAULT_COUNT ? `?count=${count}` : '' });
		this.setState({ count });
	};

	renderSelectCount() {
		return <Select value={this.state.count} onChange={this.changeCount} options={COUNTS} />;
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

	renderCommitMessage(push) {
		const message = push.message.slice(0, 80);
		return <CommitMessage message={message} />;
	}

	renderPushLog() {
		const { pushlog } = this.state;

		if (!pushlog) {
			return 'Loading…';
		}

		const header = ['processed', 'branch', 'sha', 'created_at', 'author', 'message'];
		const rows = pushlog.map(push => [
			this.renderProcessed(push),
			push.branch,
			this.renderSha(push),
			<FormatDate date={push.created_at} />,
			push.author,
			this.renderCommitMessage(push),
		]);

		return <Table header={header} rows={rows} />;
	}

	render() {
		return (
			<div className="layout">
				<Masterbar />
				<div className="content">
					{this.renderSelectCount()}
					{this.renderPushLog()}
				</div>
			</div>
		);
	}
}

export default PushLogView;
