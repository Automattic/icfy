import React from 'react';
import { Link } from 'react-router-dom';

import { getChartData, getChunkList } from './api';
import Masterbar from './Masterbar';
import Chart from './Chart';
import PushDetails from './PushDetails';
import Select from './Select';
import ChunkList from './ChunkList';
import * as _ from 'lodash';

const SIZES = ['stat_size', 'parsed_size', 'gzip_size'];
const PERIODS = [
	{ value: 'last200', name: 'last 200 pushes' },
	{ value: 'last400', name: 'last 400 pushes' },
	{ value: 'last800', name: 'last 800 pushes' },
	{ value: 'last1600', name: 'last 1600 pushes' },
];

class ChunkGroupsChartView extends React.Component {
	constructor(props) {
		super(props);

		const searchParams = new URLSearchParams(props.location.search);
		const selectedBranch = searchParams.get('branch') || 'master';

		this.state = {
			chunks: null,
			givenChunkGroups: [],
			toLoadChunkGroups: ['build', 'vendor', 'reader'],
			selectedSize: 'gzip_size',
			selectedPeriod: 'last200',
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

	changeSize = event => this.setSize(event.target.value);
	changePeriod = event => this.setPeriod(event.target.value);

	showPush = pushIndex => {
		const pushToLoad = this.state.data[0].data[pushIndex];
		const prevPush = pushIndex > 0 ? this.state.data[0].data[pushIndex - 1] : null;

		this.setState({
			currentPushSha: pushToLoad.sha,
			currentPrevPushSha: prevPush ? prevPush.sha : null,
		});
	};

	loadChunks() {
		getChunkList().then(response => {
			const { chunks } = response.data;
			this.setState({ chunks });
		});
	}

	loadChart() {
		const chunks = this.state.toLoadChunkGroups;
		Promise.all(
			chunks.map(chunk =>
				getChartData(chunk, this.state.selectedPeriod, this.state.selectedBranch).then(response => {
					return {
						chunk,
						data: response.data.data,
					};
				})
			)
		).then(data => this.setData(data));
	}

	setGivenChunkGroups = givenChunkGroups => {
		this.setState({ givenChunkGroups }, () => this.loadChart());
	};

	setToLoadChunkGroups = toLoadChunkGroups => {
		if (toLoadChunkGroups.length === 0) {
			toLoadChunkGroups = ['reader'];
		}
		this.setState({ toLoadChunkGroups }, () => this.loadChart());
	};

	setPeriod(selectedPeriod) {
		this.setState({ selectedPeriod }, () => this.loadChart());
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
		const chunksSummed = sumChunks(data);
		const chartData = [[chunksSummed[0].chunk, ...chunksSummed.map(d => d[selectedSize])]];
		this.setState({ data, chartData });
	}

	render() {
		const toLoadOptions = _.without(this.state.chunks, ...this.state.givenChunkGroups);
		return (
			<div className="layout">
				<Masterbar />
				<div className="content">
					<p>
						Select the size type you're interested in:
						<Select value={this.state.selectedSize} onChange={this.changeSize} options={SIZES} />
					</p>
					<p>
						Given these already-loaded chunk groups:
						<ChunkList
							value={this.state.givenChunkGroups}
							onChange={this.setGivenChunkGroups}
							options={this.state.chunks}
						/>
					</p>
					<p>
						How much JS does it take to load these chunk groups:
						<ChunkList
							value={this.state.toLoadChunkGroups}
							onChange={this.setToLoadChunkGroups}
							options={toLoadOptions}
						/>
					</p>
					<p>
						Showing
						<Select
							value={this.state.selectedPeriod}
							onChange={this.changePeriod}
							options={PERIODS}
						/>
						in <b>master</b> (choose <Link to="/branch">another branch</Link>)
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

function sumChunks(chunks) {
	const chunksData = chunks.map(chunk => chunk.data);
	const chartData = _.zip(...chunksData).map(zippedChunksData => {
		const chunk = `sum( ${_.map(zippedChunksData, 'chunk').join(', ')} )`;
		const stat_size = _.sumBy(zippedChunksData, data => data.stat_size);
		const parsed_size = _.sumBy(zippedChunksData, data => data.parsed_size);
		const gzip_size = _.sumBy(zippedChunksData, data => data.gzip_size);
		const sha = zippedChunksData[0].sha;

		return { chunk, stat_size, parsed_size, gzip_size, sha };
	});
	return chartData;
}

// function sumChunkGroups(givenChunkGroups, toLoadChunkGroups, chunksByName) {
// 	const givenChunks = givenChunkGroups;
// }

export default ChunkGroupsChartView;
