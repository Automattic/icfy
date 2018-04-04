import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import ChartView from './ChartView';
import ChunkGroupsChartView from './ChunkGroupsChartView';
import PushView from './PushView';
import BranchView from './BranchView';
import PushLogView from './PushLogView';
import './App.css';

const App = () => (
	<BrowserRouter>
		<Switch>
			<Route exact path="/" component={ChartView} />
			<Route path="/push/:sha/:prevSha" component={PushView} />
			<Route path="/branch" component={BranchView} />
			<Route path="/pushlog" component={PushLogView} />
			<Route path="/chunkgroups" component={ChunkGroupsChartView} />
		</Switch>
	</BrowserRouter>
);

export default App;
