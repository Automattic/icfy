import React, { Component } from 'react';
import c3 from 'c3';
import 'c3/c3.css';

class Chart extends Component {
	render() {
		return (
			<div className="chart" ref={el => (this.chartEl = el)} />
		);
	}

	componentDidMount() {
		this.drawChart();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.chartData === this.props.chartData) {
			return;
		}
		this.drawChart();
	}

	drawChart() {
		if (!this.chartEl) {
			return;
		}

		c3.generate({
			bindto: this.chartEl,
			data: {
				columns: this.props.chartData,
				onmouseover: this.handleMouseOver,
			},
		});
	}

	handleMouseOver = (d, el) => {
		this.props.onMouseOver && this.props.onMouseOver(d.index);
	};
}

export default Chart;
