import React from 'react';
import { getBranches, getBranch, getPush, getDelta, insertPush } from './api';
import Masterbar from './Masterbar';
import Select from './Select';
import Delta from './Delta';

const CommitMessage = ({ message }) => {
	const children = [];
	const re = /#(\d+)/g;
	let i = 0,
		match;
	while ((match = re.exec(message))) {
		children.push(
			message.substr(i, match.index - i),
			<a href={`https://github.com/Automattic/wp-calypso/pull/${match[1]}`}>{match[0]}</a>
		);
		i = match.index + match[0].length;
	}
	children.push(message.substr(i));

	return <span>{children}</span>;
};

const BranchCommit = ({ commit }) => {
	if (!commit) {
		return <div>...</div>;
	}

	return (
		<p className="push">
			<b>Commit:</b> {commit.sha}
			<br />
			<b>Author:</b> {commit.author}
			<br />
			<b>At:</b> {commit.created_at}
			<br />
			<b>Message:</b> <CommitMessage message={commit.message} />
		</p>
	);
};

class BranchPushSubmit extends React.Component {
	state = { ancestor: '' };

	setAncestor = event => this.setState({ ancestor: event.target.value });

	handleSubmit = () =>
		insertPush({
			...this.props.commit,
			branch: this.props.branch,
			ancestor: this.state.ancestor,
		});

	render() {
		const { ancestor } = this.state;

		return (
			<p>
				<label>Ancestor SHA:</label>
				<input className="input" value={ancestor} onChange={this.setAncestor} />
				<button className="button" disabled={!ancestor} onClick={this.handleSubmit}>
					Build
				</button>
			</p>
		);
	}
}

class BranchView extends React.Component {
	constructor(props) {
		super(props);

		const searchParams = new URLSearchParams(props.location.search);
		const selectedBranch = searchParams.get('branch') || '';

		this.state = {
			selectedBranch,
			branchList: null,
			selectedBranchHead: null,
			selectedBranchPush: null,
			selectedBranchDelta: null,
		};
	}

	componentDidMount() {
		this.loadBranches();
		if (this.state.selectedBranch) {
			this.loadBranchHead(this.state.selectedBranch);
		}
	}

	loadBranches() {
		getBranches().then(res => {
			const branchList = [
				{ value: '', name: '-- select branch --' },
				...res.data.branches.filter(branch => branch !== 'master'),
			];
			this.setState({ branchList });
		});
	}

	async loadBranchHead(branch) {
		const branchResponse = await getBranch(branch);
		const { sha, author, commit } = branchResponse.data.branch.commit;
		const head = {
			sha,
			author: author.login,
			message: commit.message.split('\n')[0],
			created_at: commit.committer.date,
		};
		this.setState({ selectedBranchHead: head });

		const pushResponse = await getPush(sha);
		const { push } = pushResponse.data;

		if (!push) {
			return;
		}

		this.setState({ selectedBranchPush: push });

		if (!push.ancestor) {
			return;
		}

		const deltaResponse = await getDelta('gzip_size', push.sha, push.ancestor);
		this.setState({ selectedBranchDelta: deltaResponse.data.delta });
	}

	selectBranch = event => {
		const selectedBranch = event.target.value;
		this.setState({
			selectedBranch,
			selectedBranchHead: null,
			selectedBranchPush: null,
			selectedBranchDelta: null,
		});
		this.loadBranchHead(selectedBranch);
	};

	renderBranchCommit() {
		const { selectedBranch, selectedBranchHead } = this.state;

		if (!selectedBranch) {
			return null;
		}

		return <BranchCommit commit={selectedBranchHead} />;
	}

	renderBranchPushSubmit() {
		const { selectedBranch, selectedBranchHead, selectedBranchPush } = this.state;

		if (selectedBranchHead && !selectedBranchPush) {
			return <BranchPushSubmit branch={selectedBranch} commit={selectedBranchHead} />;
		}

		return null;
	}

	renderBranchDelta() {
		const { selectedBranchDelta } = this.state;

		if (!selectedBranchDelta) {
			return null;
		}

		return <Delta size="gzip_size" delta={selectedBranchDelta} />;
	}

	render() {
		const { branchList, selectedBranch } = this.state;

		return (
			<div className="layout">
				<Masterbar />
				<div className="content">
					<p>
						<label>Showing stats for branch:</label>
						<Select value={selectedBranch} onChange={this.selectBranch} options={branchList} />
					</p>
					{this.renderBranchCommit()}
					{this.renderBranchPushSubmit()}
					{this.renderBranchDelta()}
				</div>
			</div>
		);
	}
}

export default BranchView;
