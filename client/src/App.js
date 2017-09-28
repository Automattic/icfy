import React, { Component } from 'react';
import { get } from 'axios';
import c3 from 'c3';
import './App.css';
import 'c3/c3.css';

// const apiURL = 'http://localhost:5000';
const apiURL = 'http://api.iscalypsofastyet.com:5000';
const sizes = ['stat_size', 'parsed_size', 'gzip_size'];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const Select = ({ value, onChange, options }) => {
	if (!options) {
		return (
			<select className="select" disabled>
				Loading
			</select>
		);
	}

	return (
		<select className="select" value={value} onChange={onChange}>
			{options.map(opt => (
				<option key={opt} value={opt}>
					{opt}
				</option>
			))}
		</select>
	);
};

const Table = ({ data, size }) => {
	if (!data) {
		return <div>Loading</div>;
	}

	return (
		<table className="table">
			<thead>
				<tr>
					<th>Commit</th>
					<th>Time</th>
					<th>{size}</th>
				</tr>
			</thead>
			<tbody>
				{data.map(d => (
					<tr key={d.sha}>
						<td>{d.sha}</td>
						<td>{d.created_at}</td>
						<td>{d[size]}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
};

const CommitLink = ({ sha }) => (
	<a href={`https://github.com/Automattic/wp-calypso/commit/${sha}`}>{sha}</a>
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
			let text;
			if (!d.firstSize) {
				text = 'new chunk';
			} else if (!d.secondSize) {
				text = 'deleted chunk';
			} else {
				const diff = d.secondSize - d.firstSize;
				text = diff > 0 ? `+${diff} bytes` : `${diff} bytes`;
			}
			return (
				<span>
					{d.chunk}: {text}
					<br />
				</span>
			);
		});
	}

	return [<b>Delta:</b>, <br />, content];
};

const PushDetails = ({ sha, push, delta }) => {
	if (!sha) {
		return null;
	}

	return (
		<div className="push">
			<b>Commit:</b> <CommitLink sha={sha} />
			<br />
			<Push push={push} />
			<Delta delta={delta} />
		</div>
	);
};

class Chart extends Component {
	render() {
		const pushCount = this.props.data ? this.props.data.length : null;

		return (
			<div className="chart-container">
				{pushCount !== null && (
					<div className="chart-header">
						Showing last {pushCount} pushes in <b>master</b>
					</div>
				)}
				<div className="chart" ref={el => (this.chartEl = el)} />
			</div>
		);
	}

	componentDidMount() {
		this.drawChart();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.data === this.props.data && prevProps.size === this.props.size) {
			return;
		}
		this.drawChart();
	}

	drawChart() {
		if (!this.chartEl) {
			return;
		}

		const { data, size } = this.props;

		if (!data) {
			return;
		}

		c3.generate({
			bindto: this.chartEl,
			data: {
				columns: [[size, ...data.map(d => d[size])]],
				onmouseover: this.handleMouseOver,
			},
		});
	}

	handleMouseOver = (d, el) => {
		this.props.onMouseOver && this.props.onMouseOver(d.index);
	};
}

const Label = ({ children }) => <label className="label">{children}</label>;

const GitHubButton = () => (
	<span className="button">
		<a
			className="github-button"
			href="https://github.com/jsnajdr/icfy"
			aria-label="View sources on GitHub"
		>
			GitHub
		</a>
	</span>
);

class App extends Component {
	state = {
		chunks: null,
		selectedChunk: 'build',
		selectedSize: 'gzip_size',
		chart: null,
		currentPushSha: null,
		currentPush: null,
		currentDelta: null,
	};

	componentDidMount() {
		this.loadChunks();
		this.loadChart();
	}

	changeChunk = event => {
		const selectedChunk = event.target.value;
		this.setState({ selectedChunk }, () => this.loadChart());
	};

	changeSize = event => {
		this.setState({ selectedSize: event.target.value });
	};

	showPush = async pushIndex => {
		const pushToLoad = this.state.chart[pushIndex];
		const prevPush = pushIndex > 0 ? this.state.chart[pushIndex - 1] : null;

		this.setState({
			currentPushSha: pushToLoad.sha,
			currentPush: null,
			currentDelta: null,
		});

		await sleep(500);
		if (this.state.currentPushSha !== pushToLoad.sha) {
			return;
		}

		const pushResponse = await get(`${apiURL}/push/${pushToLoad.sha}`);
		if (this.state.currentPushSha !== pushToLoad.sha) {
			return;
		}

		const currentPush = pushResponse.data.push;
		this.setState({ currentPush });

		if (!prevPush) {
			return;
		}

		const deltaResponse = await get(
			`${apiURL}/delta/${this.state.selectedSize}/${prevPush.sha}/${pushToLoad.sha}`
		);
		if (this.state.currentPushSha !== pushToLoad.sha) {
			return;
		}

		const currentDelta = deltaResponse.data.delta;
		this.setState({ currentDelta });
	};

	loadChunks() {
		get(`${apiURL}/chunks`).then(response => {
			const { chunks } = response.data;
			this.setState({ chunks });
		});
	}

	loadChart() {
		get(`${apiURL}/chart/week/${this.state.selectedChunk}`).then(response => {
			const { data } = response.data;
			this.setState({ chart: data });
		});
	}

	render() {
		return (
			<div className="layout">
				<div className="masterbar">
					<span className="title">Is Calypso fast yet?</span>
					<span className="tagline">Tracking Webpack bundle sizes since 2017</span>
					<GitHubButton />
				</div>
				<div className="content">
					<Label>Select the chunk to display:</Label>
					<Select
						value={this.state.selectedChunk}
						onChange={this.changeChunk}
						options={this.state.chunks}
					/>
					<Label>Select the size type you're interested in:</Label>
					<Select value={this.state.selectedSize} onChange={this.changeSize} options={sizes} />
					<Chart
						data={this.state.chart}
						size={this.state.selectedSize}
						onMouseOver={this.showPush}
					/>
					<PushDetails
						sha={this.state.currentPushSha}
						push={this.state.currentPush}
						delta={this.state.currentDelta}
					/>
				</div>
			</div>
		);
	}
}

export default App;
