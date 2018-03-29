const { get } = require('axios');
const path = require('path');
const nconf = require('nconf');

nconf.env().file({ file: path.join(__dirname, '../config/config.json') });

const REPO = nconf.get('repository');
const REPO_URL = `https://api.github.com/repos/${REPO}`;

exports.getEvents = (page = 1) => get(`${REPO_URL}/events` + (page > 1 ? `?page=${page}` : ''));
exports.getBranches = () => get(`${REPO_URL}/git/refs/heads`);
exports.getBranch = name => get(`${REPO_URL}/branches/${name}`);
