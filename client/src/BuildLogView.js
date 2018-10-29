import React from 'react';
import { getCircleBuildLog } from './api';
import Masterbar from './Masterbar';
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

const DEFAULT_COUNT = '20';
const COUNTS = [
	{ value: '20', name: 'last 20 builds' },
	{ value: '50', name: 'last 50 builds' },
	{ value: '100', name: 'last 100 builds' },
	{ value: '200', name: 'last 200 builds' },
];

class BuildLogView extends React.Component {
	constructor(props) {
		super(props);

		const searchParams = new URLSearchParams(this.props.location.search);
		const count = searchParams.get('count') || DEFAULT_COUNT;

		this.state = { count, buildlog: null };
	}

	componentDidMount() {
		this.loadBuildLog();
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevState.count !== this.state.count) {
			this.loadBuildLog();
		}
	}

	async loadBuildLog() {
		const response = await getCircleBuildLog(this.state.count);
		this.setState({ buildlog: response.data.buildlog });
	}

	changeCount = event => {
		const count = event.target.value;
		this.props.history.push({ search: count !== DEFAULT_COUNT ? `?count=${count}` : '' });
		this.setState({ count });
	};

	renderSelectCount() {
		return <Select value={this.state.count} onChange={this.changeCount} options={COUNTS} />;
	}

	renderSha(sha) {
		return (
			<span>
				<PushLink sha={sha} len={10} /> <GitHubLink sha={sha} />
			</span>
		);
	}

	renderCircleBuild(buildNum) {
		return <a href={`https://circleci.com/gh/Automattic/wp-calypso/${buildNum}`}>{buildNum}</a>;
	}

	renderBuildLog() {
		const { buildlog } = this.state;

		if (!buildlog) {
			return 'Loading…';
		}

		const header = ['branch', 'sha', 'circleci build'];
		const rows = buildlog.map(build => [
			build.branch,
			this.renderSha(build.sha),
			this.renderCircleBuild(build.build_num),
		]);

		return <Table header={header} rows={rows} />;
	}

	render() {
		return (
			<div className="layout">
				<Masterbar />
				<div className="content">
					{this.renderSelectCount()}
					{this.renderBuildLog()}
				</div>
			</div>
		);
	}
}

export default BuildLogView;
