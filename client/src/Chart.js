import React, { Component } from 'react';
import c3 from 'c3';
import 'c3/c3.css';

class Chart extends Component {
	render() {
		const pushCount = this.props.chartData[0].length - 1;

		return (
			<div className="chart-container">
				<div className="chart-header">
					Showing last {pushCount} pushes in <b>master</b>
				</div>
				<div className="chart" ref={el => (this.chartEl = el)} />
			</div>
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
