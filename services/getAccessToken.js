const axios = require('axios');

async function getAccessToken(baseUrl, authCode, redirectUri, clientId, clientSecret) {
    const response = await axios({
        baseURL: baseUrl,
        url: '/api/token',
        method: 'post',
        data: {
            code: authCode,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        },
        headers: {
            'Authorization': 'Basic ' + (Buffer.from(clientId + ':' +
                clientSecret)).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
    });
    return {
        accessToken: response.data.access_token,
        tokenExpiresIn: response.data.expires_in,
    }
}

module.exports = getAccessToken;
