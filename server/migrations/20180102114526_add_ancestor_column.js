exports.up = function(knex, Promise) {
	return knex.schema.alterTable('pushes', t => {
		t.string('ancestor', 160);
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.alterTable('pushes', t => {
		t.dropColumn('ancestor');
	});
};
