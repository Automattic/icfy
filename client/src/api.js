import { get, post } from 'axios';

// const apiURL = 'http://localhost:5000';
const apiURL = 'http://api.iscalypsofastyet.com:5000';

export const getChartData = (chunk, period) => get(`${apiURL}/chart/${period}/${chunk}`);
export const getChunkList = () => get(`${apiURL}/chunks`);
export const getPush = sha => get(`${apiURL}/push/${sha}`);
export const insertPush = push => post(`${apiURL}/push`, push);
export const getDelta = (size, sha, prevSha) => get(`${apiURL}/delta/${size}/${prevSha}/${sha}`);

const GH_REPO_SLUG = 'Automattic/wp-calypso';
const GH_REPO_URL = `https://api.github.com/repos/${GH_REPO_SLUG}`;

export const getBranches = () =>
	get(`${GH_REPO_URL}/git/refs/heads`).then(response =>
		response.data.map(branch => branch.ref.replace(/^refs\/heads\//, ''))
	);

export const getBranch = branch =>
	get(`${GH_REPO_URL}/branches/${branch}`).then(response => response.data);
