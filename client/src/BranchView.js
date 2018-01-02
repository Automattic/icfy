import React from 'react';
import { getBranches, getBranch, getPush, insertPush } from './api';
import Masterbar from './Masterbar';
import Select from './Select';

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
		<div>
			<b>Commit:</b> {commit.sha}
			<br />
			<b>Author:</b> {commit.author}
			<br />
			<b>At:</b> {commit.created_at}
			<br />
			<b>Message:</b> <CommitMessage message={commit.message} />
		</div>
	);
};

const BranchPushData = () => <div>Yes, we have data for this push: [link]</div>;

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
			<div>
				<label>Ancestor SHA:</label>
				<input value={ancestor} onChange={this.setAncestor} />
				<button disabled={!ancestor} onClick={this.handleSubmit}>
					Build
				</button>
			</div>
		);
	}
}

class BranchView extends React.Component {
	state = {
		branchList: null,
		selectedBranch: '',
		selectedBranchHead: null,
		selectedBranchPush: null,
	};

	componentDidMount() {
		this.loadBranches();
	}

	loadBranches() {
		getBranches().then(res =>
			this.setState({
				branchList: res.data.branches,
			})
		);
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
		this.setState({ selectedBranchPush: pushResponse.data.push });
	}

	selectBranch = event => {
		const selectedBranch = event.target.value;
		this.setState({
			selectedBranch,
			selectedBranchHead: null,
			selectedBranchPush: null,
		});
		this.loadBranchHead(selectedBranch);
	};

	renderBranchPush() {
		const { selectedBranch, selectedBranchHead, selectedBranchPush } = this.state;

		if (!selectedBranchHead) {
			return null;
		}

		if (selectedBranchPush) {
			return <BranchPushData push={selectedBranchPush} />;
		}

		return <BranchPushSubmit branch={selectedBranch} commit={selectedBranchHead} />;
	}

	render() {
		// const searchParams = new URLSearchParams(props.location.search);
		// const branch = searchParams.get('branch');
		const { branchList, selectedBranch, selectedBranchHead, selectedBranchPush } = this.state;

		return (
			<div className="layout">
				<Masterbar />
				<div className="content">
					Please select a branch:
					<Select value={selectedBranch} onChange={this.selectBranch} options={branchList} />
					<BranchCommit commit={selectedBranchHead} />
					{this.renderBranchPush()}
				</div>
			</div>
		);
	}
}

export default BranchView;
