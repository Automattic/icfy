import React from 'react';
import { Link } from 'react-router-dom';
import { getPush, getDelta } from './api';
import Delta from './Delta';

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

function pushParamsEqual(paramsA, paramsB) {
	return ['sha', 'prevSha'].every(prop => paramsA[prop] === paramsB[prop]);
}

class PushDetails extends React.Component {
	static defaultProps = {
		debounceDelay: 0,
	};

	state = {
		push: null,
		delta: null,
	};

	componentDidMount() {
		this.loadPush(this.props);
	}

	componentWillReceiveProps(nextProps) {
		if (!pushParamsEqual(this.props, nextProps)) {
			this.loadPush(nextProps);
		}
	}

	async loadPush(pushParams) {
		this.setState({
			push: null,
			delta: null,
		});

		if (this.props.debounceDelay > 0) {
			await sleep(this.props.debounceDelay);
		}

		if (!pushParamsEqual(this.props, pushParams)) {
			return;
		}

		const pushResponse = await getPush(pushParams.sha);

		if (!pushParamsEqual(this.props, pushParams)) {
			return;
		}

		this.setState({ push: pushResponse.data.push });

		if (!pushParams.prevSha) {
			return;
		}

		const deltaResponse = await getDelta(pushParams.prevSha, pushParams.sha);

		if (!pushParamsEqual(this.props, pushParams)) {
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
