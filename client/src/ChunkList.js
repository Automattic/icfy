import React from 'react';
import Select from 'react-select';
import { memoize } from 'lodash';

const optionFromValue = memoize(value => ({ value, label: value }));
const optionToValue = option => option.value;

class ChunkList extends React.Component {
	handleChange = selectedOptions => {
		const selectedValues = (selectedOptions || []).map(optionToValue);
		this.props.onChange(selectedValues);
	};

	render() {
		const { value, options } = this.props;

		return (
			<Select
				className="smart-select"
				isMulti
				loadingPlaceholder="Loading chunks…"
				isLoading={!options}
				value={value && value.map(optionFromValue)}
				onChange={this.handleChange}
				options={options && options.map(optionFromValue)}
			/>
		);
	}
}

export default ChunkList;
