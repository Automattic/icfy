import { get } from 'axios';

const apiURL = '';

export function buildQuery(query) {
	let queryString = '';
	let separator = '?';
	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined) {
			queryString += separator + key + '=' + value;
			separator = '&';
		}
	}
	return queryString;
}

export const getChartData = (chunk, period, branch) =>
	get(`${apiURL}/chart?period=${period}&chunk=${chunk}&branch=${branch}`);

export const getChunkGroupChartData = (chunks, loadedChunks, period, branch) => {
	const loadedChunksQuery = loadedChunks ? '&loadedChunks=' + loadedChunks.join() : '';
	return get(
		`${apiURL}/groupchart?period=${period}&branch=${branch}&chunks=${chunks}${loadedChunksQuery}`
	);
};

export const getChunkList = () => get(`${apiURL}/chunks`);

export const getChunkGroupList = () => get(`${apiURL}/chunkgroups`);

export const getPush = sha => get(`${apiURL}/push?sha=${sha}`);

export const getPushes = branch => get(`${apiURL}/pushes?branch=${branch}`);

export const getDelta = (firstSha, secondSha) =>
	get(`${apiURL}/delta?first=${firstSha}&second=${secondSha}`);

export const getPushLog = (count, branch) =>
	get(`${apiURL}/pushlog` + buildQuery({ count, branch }));

export const getCircleBuildLog = (count, branch) =>
	get(`${apiURL}/buildlog` + buildQuery({ count, branch }));

const GH_REPO_SLUG = 'Automattic/wp-calypso';
const GH_REPO_URL = `https://api.github.com/repos/${GH_REPO_SLUG}`;

export const getBranches = () =>
	get(`${GH_REPO_URL}/git/refs/heads`).then(response =>
		response.data.map(branch => branch.ref.replace(/^refs\/heads\//, ''))
	);

export const getBranch = branch =>
	get(`${GH_REPO_URL}/branches/${branch}`).then(response => response.data);
