exports.up = function(knex, Promise) {
	return knex.schema.alterTable('circle_builds', t => {
		t.dropUnique(['sha']);
		t.index(['sha']);
		t.primary(['build_num']);
		t.boolean('success')
			.notNullable()
			.defaultTo(true)
			.index();
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.alterTable('pushes', t => {
		t.dropColumn('success');
		t.dropPrimary();
		t.dropIndex(['sha']);
		t.unique(['sha']);
	});
};
