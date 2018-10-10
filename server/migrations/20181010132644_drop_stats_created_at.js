exports.up = function(knex, Promise) {
	return knex.schema.alterTable('stats', t => {
		t.dropColumn('created_at');
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.alterTable('stats', t => {
		t.timestamp('created_at')
			.notNullable()
			.index();
	});
};
