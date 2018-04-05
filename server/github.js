const { get } = require('axios');

const repoUrl = repoSlug => `https://api.github.com/repos/${repoSlug}`;

exports.getRepoEvents = (repo, page = 1) =>
	get(`${repoUrl(repo)}/events` + (page > 1 ? `?page=${page}` : ''));

exports.getRepoBranches = repo => get(`${repoUrl(repo)}/git/refs/heads`);

exports.getRepoBranch = (repo, name) => get(`${repoUrl(repo)}/branches/${name}`);
