# Server

A set of two Node.js scripts running on an EC2 instance and accessing data in a MySQL/Aurora database.

**api.js** is an Express.js HTTP server that provides REST API for the frontend to use and webhook
endpoints for incoming CircleCI and GitHub notifications about opened/updated PRs and finished builds.

**builder.js** checks the `pushes` table for new pushes, and if it finds new, unprocessed ones,
downloads their stats from CircleCI artifact URLs, processes them and records them in the `stats` table.

Knex.js is used as a SQL client library and as a tool to maintain the database schema and do schema migrations.

# Client

A simple React app based on `create-react-app` that shows the frontend and uses the REST API provided
by the server. C3 is used to display the charts. It's running as a static website hosted in an S3 bucket.

The iscalypsofastyet.com domain is owned by Automattic and a systems request is needed to change the
IP of the S3 bucket or the EC2 instance in case any of them changes.
