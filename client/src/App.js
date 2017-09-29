import React, { Component } from 'react';
import { get } from 'axios';
import Chart from './Chart';
import './App.css';

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

class CheckList extends Component {
	static defaultProps = {
		value: [],
	};

	handleChange = event => {
		const { value, onChange } = this.props;
		const { name, checked } = event.target;
		if (checked) {
			onChange([...value, name]);
		} else {
			onChange(value.filter(v => v !== name));
		}
	};

	render() {
		const { value, options } = this.props;

		if (!options) {
			return null;
		}

		return (
			<div className="checklist">
				{options.map(opt => (
					<div key={opt} className="checklist__item">
						<input
							type="checkbox"
							id={opt}
							name={opt}
							checked={value.includes(opt)}
							onChange={this.handleChange}
						/>
						<label htmlFor={opt}>{opt}</label>
					</div>
				))}
			</div>
		);
	}
}

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
		selectedChunks: ['build'],
		selectedSize: 'gzip_size',
		data: null,
		chartData: null,
		currentPushSha: null,
		currentPush: null,
		currentDelta: null,
	};

	componentDidMount() {
		this.loadChunks();
		this.loadChart();
	}

	changeChunks = chunks => this.setChunks(chunks);
	changeSize = event => this.setSize(event.target.value);

	showPush = async pushIndex => {
		const pushToLoad = this.state.data[0].data[pushIndex];
		const prevPush = pushIndex > 0 ? this.state.data[0].data[pushIndex - 1] : null;

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
		Promise.all(
			this.state.selectedChunks.map(chunk =>
				get(`${apiURL}/chart/week/${chunk}`).then(response => ({
					chunk,
					data: response.data.data,
				}))
			)
		).then(data => this.setData(data));
	}

	setChunks(selectedChunks) {
		if (selectedChunks.length === 0) {
			selectedChunks = ['build'];
		}
		this.setState({ selectedChunks }, () => this.loadChart());
	}

	setSize(selectedSize) {
		const { data } = this.state;
		this.setState({
			selectedSize,
			chartData: data.map(chunkData => [
				chunkData.chunk,
				...chunkData.data.map(d => d[selectedSize]),
			]),
		});
	}

	setData(data) {
		const { selectedSize } = this.state;
		this.setState({
			data,
			chartData: data.map(chunkData => [
				chunkData.chunk,
				...chunkData.data.map(d => d[selectedSize]),
			]),
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
				<div className="sidebar">
					<Label>Select the chunks to display:</Label>
					<CheckList
						value={this.state.selectedChunks}
						onChange={this.changeChunks}
						options={this.state.chunks}
					/>
				</div>
				<div className="content">
					<Label>Select the size type you're interested in:</Label>
					<Select value={this.state.selectedSize} onChange={this.changeSize} options={sizes} />
					{this.state.chartData && (
						<Chart chartData={this.state.chartData} onMouseOver={this.showPush} />
					)}
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
