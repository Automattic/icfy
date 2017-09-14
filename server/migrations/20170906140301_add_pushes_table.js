exports.up = function(knex, Promise) {
	return knex.schema.createTable('pushes', t => {
		t.increments();
		t.string('sha', 160).notNullable().unique();
		t.timestamp('created_at').notNullable().index();
		t.text('author').notNullable();
		t.text('message').notNullable();
		t.boolean('processed').notNullable().defaultTo(false).index();
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.dropTable('pushes');
};
