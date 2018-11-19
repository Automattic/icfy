import React from 'react';
import { buildQuery, getCircleBuildLog } from './api';
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

const DEFAULT_BRANCH = '*';
const BRANCHES = [
	{ value: '*', name: 'all branches' },
	{ value: 'master', name: 'master branch' },
	{ value: '!master', name: 'non-master branches' },
];

function buildSearchQuery(count, branch) {
	return buildQuery({
		count: count !== DEFAULT_COUNT ? count : undefined,
		branch: branch !== DEFAULT_BRANCH ? branch : undefined,
	});
}

class BuildLogView extends React.Component {
	constructor(props) {
		super(props);

		const searchParams = new URLSearchParams(this.props.location.search);
		const count = searchParams.get('count') || DEFAULT_COUNT;
		const branch = searchParams.get('branch') || DEFAULT_BRANCH;

		this.state = { count, branch, buildlog: null };
	}

	componentDidMount() {
		this.loadBuildLog();
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevState.count !== this.state.count || prevState.branch !== this.state.branch) {
			this.loadBuildLog();
		}
	}

	async loadBuildLog() {
		const response = await getCircleBuildLog(this.state.count, this.state.branch);
		this.setState({ buildlog: response.data.buildlog });
	}

	changeCount = event => {
		const count = event.target.value;
		this.props.history.push({ search: buildSearchQuery(count, this.state.branch) });
		this.setState({ count });
	};

	changeBranch = event => {
		const branch = event.target.value;
		this.props.history.push({ search: buildSearchQuery(this.state.count, branch) });
		this.setState({ branch });
	};

	renderFilter() {
		return (
			<div>
				<Select value={this.state.count} onChange={this.changeCount} options={COUNTS} /> in{' '}
				<Select value={this.state.branch} onChange={this.changeBranch} options={BRANCHES} />
			</div>
		);
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

	renderSuccess(success) {
		return success ? '👍' : '🔴';
	}

	renderBuildLog() {
		const { buildlog } = this.state;

		if (!buildlog) {
			return 'Loading…';
		}

		const header = ['build_num', 'success', 'branch', 'sha'];
		const rows = buildlog.map(build => [
			this.renderCircleBuild(build.build_num),
			this.renderSuccess(build.success),
			build.branch,
			this.renderSha(build.sha),
		]);

		return <Table header={header} rows={rows} />;
	}

	render() {
		return (
			<div className="layout">
				<Masterbar />
				<div className="content">
					{this.renderFilter()}
					{this.renderBuildLog()}
				</div>
			</div>
		);
	}
}

export default BuildLogView;
