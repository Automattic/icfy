import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import ChartView from './ChartView';
import ChunkGroupsChartView from './ChunkGroupsChartView';
import PushView from './PushView';
import BranchView from './BranchView';
import PushLogView from './PushLogView';
import BuildLogView from './BuildLogView';
import './App.css';

const App = () => (
	<BrowserRouter>
		<Switch>
			<Route exact path="/" component={ChartView} />
			<Route path="/p/push/:sha/:prevSha?" component={PushView} />
			<Route path="/p/branch" component={BranchView} />
			<Route path="/p/pushlog" component={PushLogView} />
			<Route path="/p/buildlog" component={BuildLogView} />
			<Route path="/p/chunkgroups" component={ChunkGroupsChartView} />
		</Switch>
	</BrowserRouter>
);

export default App;
