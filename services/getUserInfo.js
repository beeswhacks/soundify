const axios = require('axios');

async function getUserInfo(baseUrl, accessToken) {
    const userInfo = await axios({
            baseURL: baseUrl,
            url: '/me',
            method: 'get',
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json',
            },
        })
    return userInfo;
}

module.exports = getUserInfo;
