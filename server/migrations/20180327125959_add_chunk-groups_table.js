exports.up = function(knex, Promise) {
	return knex.schema.createTable('chunk_groups', t => {
		t.string('sha', 160).notNullable().unique();
		t.text('chunk').notNullable();
		t.text('sibling').notNullable();
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.dropTable('chunk_groups');
};

