exports.up = function(knex, Promise) {
	return knex.schema.alterTable('stats', t => {
		t.unique(['sha', 'chunk']);
	});
};

exports.down = function(knex, Promise) {
	return knex.schema.alterTable('stats', t => {
		t.dropUnique(['sha', 'chunk']);
	});
};
