import React from 'react';
import { getBranches, getBranch, getPushes, getDelta } from './api';
import Masterbar from './Masterbar';
import Delta from './Delta';
import CommitMessage from './CommitMessage';
import Push from './Push';
import { PushLink, GitHubLink } from './links';
import Select from 'react-select';
import 'react-select/dist/react-select.css';

const BranchCommit = ({ commit }) => {
	if (!commit) {
		return <div>...</div>;
	}

	return (
		<div className="push">
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

class BranchView extends React.Component {
	constructor(props) {
		super(props);

		const searchParams = new URLSearchParams(props.location.search);
		const selectedBranch = searchParams.get('branch') || '';

		this.state = {
			selectedBranch,
			branchList: null,
			selectedBranchHead: null,
			selectedBranchPushes: null,
			selectedBranchLastPush: null,
			selectedBranchLastDelta: null,
		};
	}

	componentDidMount() {
		this.loadBranches();
		if (this.state.selectedBranch) {
			this.loadBranchHead(this.state.selectedBranch);
		}
	}

	loadBranches() {
		getBranches().then(branches => {
			const branchList = branches
				.filter(branch => branch !== 'master')
				.map(option => ({ value: option, label: option }));
			this.setState({ branchList });
		});
	}

	async loadBranchHead(branchName) {
		if (!branchName) {
			return;
		}
		const branchResponse = await getBranch(branchName);
		const { sha, author, commit } = branchResponse.commit;
		const head = {
			sha,
			author: author.login,
			message: commit.message.split('\n')[0],
			created_at: commit.committer.date,
		};

		this.setState({
			selectedBranchHead: head,
			selectedBranchPushes: 'loading',
		});

		const pushesResponse = await getPushes(branchName);
		const { pushes } = pushesResponse.data;
		const lastPush = pushes.find(p => p.sha === sha) || null;

		this.setState({
			selectedBranchPushes: pushes,
			selectedBranchLastPush: lastPush,
		});

		if (lastPush && lastPush.processed) {
			const deltaResponse = await getDelta(lastPush.ancestor, lastPush.sha);
			this.setState({ selectedBranchLastDelta: deltaResponse.data });
		}
	}

	selectBranch = option => {
		const selectedBranch = option.value || '';
		this.props.history.push({ search: selectedBranch ? `?branch=${selectedBranch}` : '' });
		this.setState({
			selectedBranch,
			selectedBranchHead: null,
			selectedBranchPushes: null,
			selectedBranchLastPush: null,
			selectedBranchLastDelta: null,
		});
		this.loadBranchHead(selectedBranch);
	};

	renderBranchCommit() {
		const { selectedBranch, selectedBranchHead } = this.state;

		if (!selectedBranch) {
			return null;
		}

		return (
			<div>
				<h4>Latest push in this branch:</h4>
				<BranchCommit commit={selectedBranchHead} />
			</div>
		);
	}

	renderBranchLastPushInfo() {
		const {
			selectedBranch,
			selectedBranchHead,
			selectedBranchPushes,
			selectedBranchLastPush,
			selectedBranchLastDelta,
		} = this.state;

		if (!selectedBranchHead) {
			return null;
		}

		if (selectedBranchPushes === 'loading') {
			return (
				<p>
					Loading pushes for branch <i>{selectedBranch}</i>…
				</p>
			);
		}

		if (!selectedBranchLastPush || !selectedBranchLastPush.processed) {
			return <p>Building…</p>;
		}

		return <Delta delta={selectedBranchLastDelta} />;
	}

	renderBranchPreviousPushes() {
		const { selectedBranchHead, selectedBranchPushes } = this.state;

		if (!Array.isArray(selectedBranchPushes)) {
			return null;
		}

		const previousPushes = selectedBranchPushes.filter(p => p.sha !== selectedBranchHead.sha);
		if (previousPushes.length === 0) {
			return null;
		}

		return (
			<div>
				<h4>Previous pushes in this branch:</h4>
				{previousPushes.map(push => (
					<div className="push" key={push.sha}>
						<b>Commit:</b> <PushLink sha={push.sha} prevSha={push.ancestor} />{' '}
						<GitHubLink sha={push.sha} />
						<br />
						<Push push={push} />
					</div>
				))}
			</div>
		);
	}

	render() {
		const { branchList, selectedBranch } = this.state;

		return (
			<div className="layout">
				<Masterbar />
				<div className="content">
					<label>
						<h4>Stats for a branch:</h4>
						<Select
							className="smart-select"
							placeholder="Choose branch…"
							loadingPlaceholder="Loading branches…"
							resetValue=""
							isLoading={!branchList}
							value={selectedBranch}
							onChange={this.selectBranch}
							options={branchList}
						/>
					</label>
					<div className="branch-info">
						{this.renderBranchCommit()}
						{this.renderBranchLastPushInfo()}
						{this.renderBranchPreviousPushes()}
					</div>
				</div>
			</div>
		);
	}
}

export default BranchView;
