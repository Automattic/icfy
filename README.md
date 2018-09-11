Server
======

A set of three Node.js scripts running on an EC2 instance and accessing data in a MySQL/Aurora database.

**queuer.js** periodically polls the GitHub API for new pushes to the Calypso repo and if it finds new ones, queues them into the database's `pushes` table.

**builder.js** checks the `pushes` table for new pushes, and if it finds new, unprocessed ones, it checks out the appropriate commit and performs a production build with `webpack-bundle-analyzer` enabled. The resulting build stats are then recored in the `stats` table.

**api.js** is an Express.js HTTP server that provides REST API for the frontend to use.

Knex.js is used as a SQL client library and as a tool to maintain the database schema and do schema migrations.

Client
======

A simple React app based on `create-react-app` that shows the frontend and uses the REST API provided by the server. C3 is used to display the charts. It's running as a static website hosted in an S3 bucket.

The iscalypsofastyet.com domain is owned by Automattic and a systems request is needed to change the
IP of the S3 bucket or the EC2 instance in case any of them changes.
