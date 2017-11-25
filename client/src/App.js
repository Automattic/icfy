import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import ChartView from './ChartView';
import PushView from './PushView';
import './App.css';

const App = () => (
	<BrowserRouter>
		<Switch>
			<Route exact path="/" component={ChartView} />
			<Route path="/push/:sha/:prevSha" component={PushView} />
		</Switch>
	</BrowserRouter>
);

export default App;
