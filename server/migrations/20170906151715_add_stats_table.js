exports.up = function(knex, Promise) {
	return knex.schema.createTable('stats', t => {
		t.increments();
		t.string('sha', 160).notNullable().index();
		t.timestamp('created_at').notNullable().index();
		t.string('chunk', 160).notNullable().index();
		t.string('hash', 160).notNullable().index();
		t.integer('stat_size').unsigned().notNullable();
		t.integer('parsed_size').unsigned().notNullable();
		t.integer('gzip_size').unsigned().notNullable();
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.dropTable('stats');
};
