const axios = require('axios');

const makeSpotifyApiCall = (baseUrl, accessToken, options) => {
    const { method, url, ...otherOptions } = options;

    return axios({
        baseURL: baseUrl,
        headers: {
            Authorization: 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
        },
        method,
        url,
        ...otherOptions,
    });
};

module.exports = makeSpotifyApiCall;
