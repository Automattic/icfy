import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import ChartView from './ChartView';
import SectionsChartView from './SectionsChartView';
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
			<Route path="/sections" component={SectionsChartView} />
		</Switch>
	</BrowserRouter>
);

export default App;
