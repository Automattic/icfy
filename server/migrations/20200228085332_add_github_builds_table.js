exports.up = function(knex, Promise) {
	return knex.schema.createTable('github_builds', t => {
		t.integer('build_num')
			.unsigned()
			.notNullable()
			.primary();
		t.string('sha', 160)
			.notNullable()
			.index();
		t.string('branch', 200).notNullable();
		t.string('ancestor', 160);
		t.boolean('success').notNullable();
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.dropTable('github_builds');
};
