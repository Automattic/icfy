
exports.up = function(knex) {
  	return knex('pushes')
		.where('branch', 'master')
		.update('branch', 'trunk')
		.then(() => 
			knex('ci_builds')
				.where('branch', 'master')
				.update('branch', 'trunk')
		);
};

exports.down = function(knex) {
	// It's unsafe to migrate this backwards
	return null;
};
