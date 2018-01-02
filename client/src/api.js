import { get, post } from 'axios';

// const apiURL = 'http://localhost:5000';
const apiURL = 'http://api.iscalypsofastyet.com:5000';

export const getChartData = (chunk, period) => get(`${apiURL}/chart/${period}/${chunk}`);
export const getChunkList = () => get(`${apiURL}/chunks`);
export const getPush = sha => get(`${apiURL}/push/${sha}`);
export const insertPush = push => post(`${apiURL}/push`, push);
export const getDelta = (size, sha, prevSha) => get(`${apiURL}/delta/${size}/${prevSha}/${sha}`);
export const getBranches = () => get(`${apiURL}/branches`);
export const getBranch = branch => get(`${apiURL}/branch?branch=${branch}`);
