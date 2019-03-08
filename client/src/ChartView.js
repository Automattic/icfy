import React from 'react';
import { Link } from 'react-router-dom';

import { buildQuery, getChartData, getChunkList } from './api';
import Masterbar from './Masterbar';
import Chart from './Chart';
import PushDetails from './PushDetails';
import Select from './Select';
import ChunkList from './ChunkList';

const SIZES = ['stat_size', 'parsed_size', 'gzip_size'];
const PERIODS = [
	{ value: 'last200', name: 'last 200 pushes' },
	{ value: 'last400', name: 'last 400 pushes' },
	{ value: 'last800', name: 'last 800 pushes' },
	{ value: 'last1600', name: 'last 1600 pushes' },
];

const DEFAULT_CHUNKS = 'build';
const DEFAULT_SIZE = 'gzip_size';
const DEFAULT_PERIOD = 'last200';
const DEFAULT_BRANCH = 'master';

const chunksToString = chunks => (chunks ? chunks.join(',') : DEFAULT_CHUNKS);
const chunksFromString = chunks => (chunks || DEFAULT_CHUNKS).split(',');

const nondefault = (value, defaultValue) => (value !== defaultValue ? value : undefined);

function fillChartData(data, length) {
	const missing = length - data.length;
	if (missing > 0) {
		return [...Array(missing).fill(data[0]), ...data];
	}
	return data;
}

function mergeChartData(data, selectedSize) {
	const maxLength = data.reduce((max, chunkData) => Math.max(max, chunkData.data.length), 0);

	return data.map(chunkData => {
		const data = fillChartData(chunkData.data.map(d => d[selectedSize]), maxLength);
		return [chunkData.chunk, ...data];
	});
}

class ChartView extends React.Component {
	constructor(props) {
		super(props);

		const searchParams = new URLSearchParams(props.location.search);
		const selectedChunks = searchParams.get('chunks') || DEFAULT_CHUNKS;
		const selectedBranch = searchParams.get('branch') || DEFAULT_BRANCH;
		const selectedSize = searchParams.get('size') || DEFAULT_SIZE;
		const selectedPeriod = searchParams.get('period') || DEFAULT_PERIOD;

		this.state = {
			chunks: null,
			selectedChunks,
			selectedSize,
			selectedPeriod,
			selectedBranch,
			data: null,
			chartData: null,
			currentPushSha: null,
			currentPrevPushSha: null,
		};
	}

	componentDidMount() {
		this.loadChunks();
		this.loadChart();
	}

	componentDidUpdate(prevProps, prevState) {
		const chunksChanged = prevState.selectedChunks !== this.state.selectedChunks;
		const periodChanged = prevState.selectedPeriod !== this.state.selectedPeriod;
		const branchChanged = prevState.selectedBranch !== this.state.selectedBranch;
		const sizeChanged = prevState.selectedSize !== this.state.selectedSize;

		if (chunksChanged || periodChanged || branchChanged) {
			this.loadChart();
		}

		if (chunksChanged || periodChanged || branchChanged || sizeChanged) {
			this.updateSearchQuery();
		}
	}

	changeChunks = chunks => this.setChunks(chunksToString(chunks));
	changeSize = event => this.setSize(event.target.value);
	changePeriod = event => this.setPeriod(event.target.value);

	showPush = pushIndex => {
		// find the longest data array, in case they have unequal length
		// (e.g., some chunk doesn't have the complete dataset because it's new)
		const longestData = this.state.data.reduce((longest, data) =>
			data.data.length > longest.data.length ? data : longest
		);
		const pushToLoad = longestData.data[pushIndex];
		const prevPush = pushIndex > 0 ? longestData.data[pushIndex - 1] : null;

		this.setState({
			currentPushSha: pushToLoad.sha,
			currentPrevPushSha: prevPush ? prevPush.sha : null,
		});
	};

	async loadChunks() {
		const response = await getChunkList();
		const { chunks } = response.data;
		this.setState({ chunks });
	}

	async loadChart() {
		const { selectedChunks, selectedPeriod, selectedBranch } = this.state;
		const requests = chunksFromString(selectedChunks).map(async chunk => {
			const response = await getChartData(chunk, selectedPeriod, selectedBranch);
			return { chunk, data: response.data.data };
		});
		const data = await Promise.all(requests);
		this.setData(data);
	}

	updateSearchQuery() {
		const search = buildQuery({
			chunks: nondefault(this.state.selectedChunks, DEFAULT_CHUNKS),
			branch: nondefault(this.state.selectedBranch, DEFAULT_BRANCH),
			size: nondefault(this.state.selectedSize, DEFAULT_SIZE),
			period: nondefault(this.state.selectedPeriod, DEFAULT_PERIOD),
		});
		this.props.history.push({ search });
	}

	setChunks(selectedChunks) {
		this.setState({ selectedChunks });
	}

	setPeriod(selectedPeriod) {
		this.setState({ selectedPeriod });
	}

	setSize(selectedSize) {
		const chartData = mergeChartData(this.state.data, selectedSize);
		this.setState({ selectedSize, chartData });
	}

	setData(data) {
		const chartData = mergeChartData(data, this.state.selectedSize);
		this.setState({ data, chartData });
	}

	render() {
		return (
			<div className="layout">
				<Masterbar />
				<div className="content">
					<p>
						Select the size type you're interested in:
						<Select value={this.state.selectedSize} onChange={this.changeSize} options={SIZES} />
					</p>
					<p>
						Select the chunks to display:
						<ChunkList
							value={chunksFromString(this.state.selectedChunks)}
							onChange={this.changeChunks}
							options={this.state.chunks}
						/>
					</p>
					<p>
						Showing
						<Select
							value={this.state.selectedPeriod}
							onChange={this.changePeriod}
							options={PERIODS}
						/>
						in <b>{this.state.selectedBranch}</b> (choose <Link to="/branch">another branch</Link>)
					</p>
					{this.state.chartData && (
						<Chart chartData={this.state.chartData} onMouseOver={this.showPush} />
					)}
					{this.state.currentPushSha && (
						<PushDetails
							sha={this.state.currentPushSha}
							prevSha={this.state.currentPrevPushSha}
							debounceDelay={500}
						/>
					)}
				</div>
			</div>
		);
	}
}

export default ChartView;
