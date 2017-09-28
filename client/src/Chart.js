import React, { Component } from 'react';
import c3 from 'c3';
import 'c3/c3.css';

class Chart extends Component {
	render() {
		const pushCount = this.props.data ? this.props.data.length : null;

		return (
			<div className="chart-container">
				{pushCount !== null && (
					<div className="chart-header">
						Showing last {pushCount} pushes in <b>master</b>
					</div>
				)}
				<div className="chart" ref={el => (this.chartEl = el)} />
			</div>
		);
	}

	componentDidMount() {
		this.drawChart();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.data === this.props.data && prevProps.size === this.props.size) {
			return;
		}
		this.drawChart();
	}

	drawChart() {
		if (!this.chartEl) {
			return;
		}

		const { data, size } = this.props;

		if (!data) {
			return;
		}

		c3.generate({
			bindto: this.chartEl,
			data: {
				columns: [[size, ...data.map(d => d[size])]],
				onmouseover: this.handleMouseOver,
			},
		});
	}

	handleMouseOver = (d, el) => {
		this.props.onMouseOver && this.props.onMouseOver(d.index);
	};
}

export default Chart;
