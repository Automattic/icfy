import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import ChartView from './ChartView';
import PushView from './PushView';
import BranchView from './BranchView';
import './App.css';

const App = () => (
	<BrowserRouter>
		<Switch>
			<Route exact path="/" component={ChartView} />
			<Route path="/push/:sha/:prevSha" component={PushView} />
			<Route path="/branch" component={BranchView} />
		</Switch>
	</BrowserRouter>
);

export default App;
