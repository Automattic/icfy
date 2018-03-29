import { get, post } from 'axios';
import * as config from './config.json';

export const getChartData = (chunk, period, branch) =>
	get(`${config.apiURL}/chart?period=${period}&chunk=${chunk}&branch=${branch}`);
export const getChunkList = () => get(`${config.apiURL}/chunks`);
export const getPush = sha => get(`${config.apiURL}/push?sha=${sha}`);
export const insertPush = push => post(`${config.apiURL}/push`, push);
export const getDelta = (firstSha, secondSha) =>
	get(`${config.apiURL}/delta?first=${firstSha}&second=${secondSha}`);
export const getPushLog = count => get(`${config.apiURL}/pushlog` + (count ? `?count=${count}` : ''));

const GH_REPO_URL = `https://api.github.com/repos/${config.repository}`;

export const getBranches = () =>
	get(`${GH_REPO_URL}/git/refs/heads`).then(response =>
		response.data.map(branch => branch.ref.replace(/^refs\/heads\//, ''))
	);

export const getBranch = branch =>
	get(`${GH_REPO_URL}/branches/${branch}`).then(response => response.data);
