import { get, post } from 'axios';

// const apiURL = 'http://localhost:5000';
const apiURL = 'http://api.iscalypsofastyet.com:5000';

export const getChartData = (chunk, period, branch) =>
	get(`${apiURL}/chart?period=${period}&chunk=${chunk}&branch=${branch}`);

export const getChunkGroupChartData = (chunks, loadedChunks, period, branch) => {
	const loadedChunksQuery = loadedChunks ? '&loadedChunks=' + loadedChunks.join() : '';
	return get(
		`${apiURL}/groupchart?period=${period}&branch=${branch}&chunks=${chunks}${loadedChunksQuery}`
	);
};

export const getChunkList = () => get(`${apiURL}/chunks`);

export const getPush = sha => get(`${apiURL}/push?sha=${sha}`);

export const getPushes = branch => get(`${apiURL}/pushes?branch=${branch}`);

export const getDelta = (firstSha, secondSha) =>
	get(`${apiURL}/delta?first=${firstSha}&second=${secondSha}`);

export const getPushLog = count => get(`${apiURL}/pushlog` + (count ? `?count=${count}` : ''));

export const removePush = sha => post(`${apiURL}/removepush`, { sha });

export const getCircleBuildLog = count =>
	get(`${apiURL}/buildlog` + (count ? `?count=${count}` : ''));

const GH_REPO_SLUG = 'Automattic/wp-calypso';
const GH_REPO_URL = `https://api.github.com/repos/${GH_REPO_SLUG}`;

export const getBranches = () =>
	get(`${GH_REPO_URL}/git/refs/heads`).then(response =>
		response.data.map(branch => branch.ref.replace(/^refs\/heads\//, ''))
	);

export const getBranch = branch =>
	get(`${GH_REPO_URL}/branches/${branch}`).then(response => response.data);
