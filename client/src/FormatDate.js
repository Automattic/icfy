import React from 'react';
import { format } from 'date-fns';

export default ({ date, fmt = 'YYYY-MM-DD HH:mm' }) => (
	<span title={format(date)}>{format(date, fmt)}</span>
);
