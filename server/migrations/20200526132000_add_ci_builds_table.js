exports.up = function (knex) {
	return knex.schema.createTable('ci_builds', (t) => {
		t.string('service', 20).notNullable();
		t.integer('build_num').unsigned().notNullable();
		t.timestamp('created_at').notNullable().index();
		t.string('sha', 160).notNullable().index();
		t.string('branch', 200).notNullable();
		t.string('ancestor', 160);
		t.boolean('success').notNullable();
		t.primary(['service', 'build_num']);
	});
};

exports.down = function (knex) {
	return knex.schema.dropTable('ci_builds');
};
