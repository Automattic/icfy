import React from 'react';
import { getPush, getDelta } from './api';
import Delta from './Delta';
import Push from './Push';
import { PushLink, GitHubLink } from './links';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

	componentDidUpdate(prevProps) {
		if (!pushParamsEqual(this.props, prevProps)) {
			this.loadPush(this.props);
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

		const prevSha = pushParams.prevSha || pushResponse.data.push.ancestor;

		if (!prevSha) {
			return;
		}

		const deltaResponse = await getDelta(prevSha, pushParams.sha);

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
