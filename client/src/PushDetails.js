import React from 'react';
import { Link } from 'react-router-dom';
import { getPush, getDelta } from './api';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const pathJoin = (...parts) =>
	parts.reduce((joined, part) => (!part ? joined : joined + '/' + part));

const PushLink = ({ sha, prevSha }) => <Link to={pathJoin(`/push/${sha}`, prevSha)}>{sha}</Link>;
const GitHubLink = ({ sha }) => (
	<a href={`https://github.com/Automattic/wp-calypso/commit/${sha}`}>code</a>
);

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

const Push = ({ push }) => (
	<div>
		<b>Author:</b> {push ? push.author : '...'}
		<br />
		<b>At:</b> {push ? push.created_at : '...'}
		<br />
		<b>Message:</b> {push ? <CommitMessage message={push.message} /> : '...'}
	</div>
);

const Delta = ({ delta }) => {
	let content;
	if (!delta) {
		content = '...';
	} else if (delta.length === 0) {
		content = 'no changes in production JS';
	} else {
		content = delta.map(d => {
			let diff,
				suffix = '';
			if (!d.firstSize) {
				diff = d.secondSize;
				suffix = '(new chunk)';
			} else if (!d.secondSize) {
				diff = -d.firstSize;
				suffix = '(deleted chunk)';
			} else {
				diff = d.secondSize - d.firstSize;
			}
			const diffText = diff >= 0 ? `+${diff} bytes` : `${diff} bytes`;
			const text = `${diffText} ${d.firstHash} -> ${d.secondHash} ${suffix}`;
			return (
				<span>
					{d.chunk}: {text}
					<br />
				</span>
			);
		});
	}

	return (
		<div>
			<b>Delta:</b>
			<br />
			{content}
		</div>
	);
};

class PushDetails extends React.Component {
	static defaultProps = {
		debounceDelay: 0,
		size: 'gzip_size',
	};

	state = {
		push: null,
		delta: null,
	};

	componentDidMount() {
		this.loadPush(this.props.sha, this.props.prevSha);
	}

	componentWillReceiveProps(nextProps) {
		if (this.props.sha !== nextProps.sha || this.props.prevSha !== nextProps.sha) {
			this.loadPush(nextProps.sha, nextProps.prevSha);
		}
	}

	async loadPush(sha, prevSha) {
		this.setState({
			push: null,
			delta: null,
		});

		if (this.props.debounceDelay > 0) {
			await sleep(this.props.debounceDelay);
		}

		if (this.props.sha !== sha) {
			return;
		}

		const pushResponse = await getPush(sha);

		if (this.props.sha !== sha) {
			return;
		}

		this.setState({ push: pushResponse.data.push });

		if (!prevSha) {
			return;
		}

		const deltaResponse = await getDelta(this.props.size, sha, prevSha);

		if (this.props.sha !== sha) {
			return;
		}

		this.setState({ delta: deltaResponse.data.delta });
	}

	render() {
		const { sha, prevSha } = this.props;
		const { push, delta } = this.state;

		if (!sha) {
			return null;
		}

		return (
			<div className="push">
				<b>Commit:</b> <PushLink sha={sha} prevSha={prevSha} /> <GitHubLink sha={sha} />
				<br />
				<Push push={push} />
				<Delta delta={delta} />
			</div>
		);
	}
}

export default PushDetails;
