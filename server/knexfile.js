const nconf = require('nconf');
const path = require('path');

nconf.env().file({ file: path.join(__dirname, '../config/config.json') });

module.exports = {
  client: 'mysql',
  connection: {
      host: nconf.get('db:host'),
      port: nconf.get('db:port') || '3306',
      user: nconf.get('db:user'),
      password: nconf.get('db:password'),
      database: nconf.get('db:database'),
  },
  pool: {
      min: 2,
      max: 10
  },
  migrations: {
      tableName: 'knex_migrations'
  }
};
