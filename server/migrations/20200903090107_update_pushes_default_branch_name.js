
exports.up = function(knex) {
	return knex.schema.alterTable('pushes', t => {
		t
			.string('branch')
			.defaultTo('trunk')
			.alter();
	})
};

exports.down = function(knex) {
	return knex.schema.alterTable('pushes', t => {
		t
			.string('branch')
			.defaultTo('master')
			.alter();
	});
};
