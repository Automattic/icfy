exports.up = async function (knex) {
	await knex.schema.dropTable('circle_builds');
	await knex.schema.dropTable('github_builds');
};

exports.down = async function (knex) {};
