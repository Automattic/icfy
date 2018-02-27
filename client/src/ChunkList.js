import React from 'react';
import Select from 'react-select';

class ChunkList extends React.Component {
	handleChange = selectedOptions => this.props.onChange(selectedOptions.map(opt => opt.value));

	render() {
		const { value, options } = this.props;

		return (
			<Select
				className="smart-select"
				multi
				loadingPlaceholder="Loading chunks…"
				isLoading={!options}
				value={value}
				onChange={this.handleChange}
				options={options && options.map(option => ({ value: option, label: option }))}
			/>
		);
	}
}

export default ChunkList;
