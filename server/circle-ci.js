const {get} = require('axios');

function buildArtifactUrl(buildNumber) {
    return `https://circleci.com/api/v1.1/project/github/Automattic/wp-calypso/${encodeURI(
        buildNumber,
    )}/artifacts`;
}

exports.getArtifacts = async buildNumber => {
    try {
        const {data} = await axios.get(buildArtifactUrl(buildNumber));
        const json = JSON.parse(data);
    } catch (e) {
      throw e;
  }
};
