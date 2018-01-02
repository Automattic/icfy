import React from 'react';

function renderOption(option) {
	if (typeof option === 'string') {
		option = { value: option, name: option };
	}

	return (
		<option key={option.value} value={option.value}>
			{option.name}
		</option>
	);
}

const Select = ({ value, onChange, options }) => {
	if (!options) {
		return (
			<select className="select" value="loading" disabled>
				<option value="loading">loading...</option>
			</select>
		);
	}

	return (
		<select className="select" value={value} onChange={onChange}>
			{options.map(renderOption)}
		</select>
	);
};

export default Select;
