import { get } from 'axios';

// const apiURL = 'http://localhost:5000';
const apiURL = 'http://api.iscalypsofastyet.com:5000';

export const getChartData = (chunk, period) => get(`${apiURL}/chart/${period}/${chunk}`);
export const getChunkList = () => get(`${apiURL}/chunks`);
export const getPush = sha => get(`${apiURL}/push/${sha}`);
export const getDelta = (size, sha, prevSha) => get(`${apiURL}/delta/${size}/${prevSha}/${sha}`);
