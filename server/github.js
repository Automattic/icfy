const { get } = require('axios');

const repoUrl = repoSlug => `https://api.github.com/repos/${repoSlug}`;

exports.getRepoBranches = repo => get(`${repoUrl(repo)}/git/refs/heads`);

exports.getRepoBranch = (repo, name) => get(`${repoUrl(repo)}/branches/${name}`);
