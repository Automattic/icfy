exports.up = function(knex, Promise) {
	return knex.schema.alterTable('pushes', t => {
		t
			.string('branch', 200)
			.notNullable()
			.defaultTo('master')
			.index();
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.alterTable('pushes', t => {
		t.dropColumn('branch');
	});
};
