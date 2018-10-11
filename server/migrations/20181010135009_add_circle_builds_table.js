exports.up = function(knex, Promise) {
	return knex.schema.createTable('circle_builds', t => {
		t.string('sha', 160)
			.notNullable()
			.unique();
		t.integer('build_num')
			.unsigned()
			.notNullable();
		t.string('branch', 200).notNullable();
		t.string('ancestor', 160);
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.dropTable('circle_builds');
};
