const nconf = require('nconf');
const axios = require('axios');

const repoUrl = repoSlug => `https://api.github.com/repos/${repoSlug}`;
const authHeaders = () => ({ headers: { Authorization: `token ${nconf.get('github:token')}` } });

exports.getPRComments = (repo, prNum) => axios.get(`${repoUrl(repo)}/issues/${prNum}/comments`);

exports.createPRComment = (repo, prNum, body) =>
	axios.post(`${repoUrl(repo)}/issues/${prNum}/comments`, { body }, authHeaders());

exports.editPRComment = (repo, commentId, body) =>
	axios.patch(`${repoUrl(repo)}/issues/comments/${commentId}`, { body }, authHeaders());

exports.deletePRComment = (repo, commentId) =>
	axios.delete(`${repoUrl(repo)}/issues/comments/${commentId}`, authHeaders());
