const axios = require('axios');
const expiresAt = require('./expiresAt');

const refreshAccessToken = async (
    baseUrl,
    refreshToken,
    clientId,
    clientSecret
) => {
    const response = await axios({
        url: `${baseUrl}api/token`,
        method: 'post',
        headers: {
            Authorization:
                'Basic ' +
                Buffer.from(clientId + ':' + clientSecret).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        },
    });

    return {
        accessToken: response.data.access_token,
        expiresAt: expiresAt(response.data.expires_in),
    };
};

module.exports = refreshAccessToken;
