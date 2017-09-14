import React, { Component } from 'react';
import { get } from 'axios';
import c3 from 'c3';
import './App.css';
import 'c3/c3.css';

// const apiURL = 'http://localhost:5000';
const apiURL = 'http://api.iscalypsofastyet.com:5000';
const sizes = ['stat_size', 'parsed_size', 'gzip_size'];

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
			{options.map(opt =>
				<option key={opt} value={opt}>
					{opt}
				</option>
			)}
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
					<th>
						{size}
					</th>
				</tr>
			</thead>
			<tbody>
				{data.map(d =>
					<tr key={d.sha}>
						<td>
							{d.sha}
						</td>
						<td>
							{d.created_at}
						</td>
						<td>
							{d[size]}
						</td>
					</tr>
				)}
			</tbody>
		</table>
	);
};

const CommitLink = ({ sha }) =>
	<a href={`https://github.com/Automattic/wp-calypso/commit/${sha}`}>
		{sha}
	</a>;

const CommitMessage = ({ message }) => {
	const children = [];
	const re = /#(\d+)/g;
	let i = 0,
		match;
	while ((match = re.exec(message))) {
		children.push(
			message.substr(i, match.index - i),
			<a href={`https://github.com/Automattic/wp-calypso/pull/${match[1]}`}>
				{match[0]}
			</a>
		);
		i = match.index + match[0].length;
	}
	children.push(message.substr(i));

	return (
		<span>
			{children}
		</span>
	);
};

const Push = ({ loading, push }) => {
	if (!push) {
		return <div className="push is-empty" />;
	}

	return (
		<div className="push">
			<b>Commit:</b> <CommitLink sha={push.sha} />
			<br />
			<b>Author:</b> {push.author}
			<br />
			<b>At:</b> {push.created_at}
			<br />
			<b>Message:</b> <CommitMessage message={push.message} />
		</div>
	);
};

const Delta = ({ loading, delta }) => {
	if (!delta) {
		return <div className="push is-empty" />;
	}

	return (
		<div className="push">
			<b>Delta:</b>
			<br />
			{delta.map(d => {
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
			})}
		</div>
	);
};

class Chart extends Component {
	render() {
		return <div className="chart" ref={el => (this.chartEl = el)} />;
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

const Label = ({ children }) =>
	<label className="label">
		{children}
	</label>;

class App extends Component {
	state = {
		chunks: null,
		selectedChunk: 'build',
		selectedSize: 'gzip_size',
		chart: null,
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

	showPush = pushIndex => {
		const pushToLoad = this.state.chart[pushIndex];
		const prevPush = pushIndex > 0 ? this.state.chart[pushIndex - 1] : null;

		get(`${apiURL}/push/${pushToLoad.sha}`).then(response => {
			const { push } = response.data;
			this.setState({ currentPush: push });
		});

		if (!prevPush) {
			this.setState({ currentDelta: null });
		} else {
			get(
				`${apiURL}/delta/${this.state.selectedSize}/${prevPush.sha}/${pushToLoad.sha}`
			).then(response => {
				const { delta } = response.data;
				this.setState({ currentDelta: delta });
			});
		}
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
					<Push push={this.state.currentPush} />
					<Delta delta={this.state.currentDelta} />
				</div>
			</div>
		);
	}
}

export default App;
