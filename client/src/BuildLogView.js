import React from 'react';
import { getCircleBuildLog } from './api';
import Masterbar from './Masterbar';
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

class BuildLogView extends React.Component {
	state = { buildlog: null, removingPushSha: null };

	componentDidMount() {
		this.loadBuildLog();
	}

	async loadBuildLog() {
		const searchParams = new URLSearchParams(this.props.location.search);
		const count = searchParams.get('count');

		const response = await getCircleBuildLog(count);
		this.setState({ buildlog: response.data.buildlog });
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
				<div className="content">{this.renderBuildLog()}</div>
			</div>
		);
	}
}

export default BuildLogView;
