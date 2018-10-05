import React from 'react';

import { getChunkGroupChartData, getChunkList, getBranches } from './api';
import Masterbar from './Masterbar';
import Chart from './Chart';
import PushDetails from './PushDetails';
import Select from './Select';
import ReactSelect from 'react-select';
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
			toLoadChunkGroups: ['build', 'reader'],
			selectedSize: 'gzip_size',
			selectedPeriod: 'last200',
			selectedBranch,
			branchList: null,
			data: null,
			chartData: null,
			currentPushSha: null,
			currentPrevPushSha: null,
		};
	}

	componentDidMount() {
		this.loadChunks();
		this.loadBranches();
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

	loadBranches() {
		getBranches().then(branchList => this.setState({ branchList }));
	}

	selectBranch = option => {
		const selectedBranch = option.value || '';
		this.props.history.push({ search: selectedBranch ? `?branch=${selectedBranch}` : '' });
		this.setState({ selectedBranch, chartData: null, currentPushSha: null }, this.loadChart);
	};

	loadChunks() {
		getChunkList().then(response => {
			const { chunks } = response.data;
			this.setState({ chunks });
		});
	}

	async loadChart() {
		const { toLoadChunkGroups, givenChunkGroups } = this.state;

		const response = await getChunkGroupChartData(
			toLoadChunkGroups,
			givenChunkGroups,
			this.state.selectedPeriod,
			this.state.selectedBranch
		);

		let xAxis = `sum( ${toLoadChunkGroups.join(', ')} )`;
		if (givenChunkGroups.length > 0) {
			xAxis += ` - sum( ${givenChunkGroups.join(', ')} )`;
		}

		this.setData({ chunk: xAxis, data: response.data.data });
	}

	setGivenChunkGroups = givenChunkGroups => {
		this.setState({ givenChunkGroups }, () => this.loadChart());
	};

	setToLoadChunkGroups = toLoadChunkGroups => {
		if (toLoadChunkGroups.length === 0) {
			toLoadChunkGroups = ['build', 'reader'];
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
		let chartData = null;
		if (data && data.data.length > 0) {
			chartData = [data.chunk, ...data.data.map(d => d[selectedSize])];
		}
		this.setState({ data: [data], chartData: [chartData] });
	}

	render() {
		const toLoadOptions = _.without(this.state.chunks, ...this.state.givenChunkGroups);
		const { selectedBranch, branchList } = this.state;

		return (
			<div className="layout">
				<Masterbar />
				<div className="content">
					<div style={{ paddingBottom: 10 }}>
						Select the size type you're interested in:
						<Select value={this.state.selectedSize} onChange={this.changeSize} options={SIZES} />
					</div>
					<div style={{ paddingBottom: 10 }}>
						Given these already-loaded chunk groups:
						<ChunkList
							value={this.state.givenChunkGroups}
							onChange={this.setGivenChunkGroups}
							options={this.state.chunks}
						/>
					</div>
					<div style={{ paddingBottom: 10 }}>
						It takes how much JS to load these chunks groups:
						<ChunkList
							value={this.state.toLoadChunkGroups}
							onChange={this.setToLoadChunkGroups}
							options={toLoadOptions}
						/>
					</div>
					<div>
						Showing
						<Select
							value={this.state.selectedPeriod}
							onChange={this.changePeriod}
							options={PERIODS}
						/>
						in
						<ReactSelect
							className="smart-select"
							loadingPlaceholder="Loading branches…"
							resetValue=""
							isLoading={!branchList}
							value={selectedBranch}
							onChange={this.selectBranch}
							options={branchList && branchList.map(option => ({ value: option, label: option }))}
						/>
					</div>
					{this.state.chartData &&
						this.state.chartData[0] && (
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

export default ChunkGroupsChartView;
