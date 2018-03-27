exports.up = function(knex, Promise) {
	return knex.schema.createTable('chunk_groups', t => {
		t.string('sha', 160).notNullable();
		t.string('chunk', 160).notNullable();
		t.string('sibling', 160).notNullable();
		t.index(['sha', 'chunk']);
		t.unique(['sha', 'chunk', 'sibling']);
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.dropTable('chunk_groups');
};
