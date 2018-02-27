import { get, post } from 'axios';

// const apiURL = 'http://localhost:5000';
const apiURL = 'http://api.iscalypsofastyet.com:5000';

export const getChartData = (chunk, period) =>
	get(`${apiURL}/chart?period=${period}&chunk=${chunk}`);
export const getChunkList = () => get(`${apiURL}/chunks`);
export const getPush = sha => get(`${apiURL}/push?sha=${sha}`);
export const insertPush = push => post(`${apiURL}/push`, push);
export const getDelta = (firstSha, secondSha) =>
	get(`${apiURL}/delta?first=${firstSha}&second=${secondSha}`);
export const getPushLog = () => get(`${apiURL}/pushlog`);

const GH_REPO_SLUG = 'Automattic/wp-calypso';
const GH_REPO_URL = `https://api.github.com/repos/${GH_REPO_SLUG}`;

export const getBranches = () =>
	get(`${GH_REPO_URL}/git/refs/heads`).then(response =>
		response.data.map(branch => branch.ref.replace(/^refs\/heads\//, ''))
	);

export const getBranch = branch =>
	get(`${GH_REPO_URL}/branches/${branch}`).then(response => response.data);
