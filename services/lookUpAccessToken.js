const User = require('../models/User');
const refreshAccessToken = require('./refreshAccessToken');

const lookUpAccessToken = async (
    sessionId,
    baseUrl,
    clientId,
    clientSecret
) => {
    const user = await User.findOne({
        sessionId,
    }).exec();

    let { accessToken, refreshToken, expiresAt } = user;
    let newAccessToken = null;
    const now = new Date();
    const eval = expiresAt < now;

    if (expiresAt < now) {
        const { accessToken, expiresAt } = await refreshAccessToken(
            baseUrl,
            refreshToken,
            clientId,
            clientSecret
        );

        newAccessToken = accessToken;

        user.accessToken = accessToken;
        user.expiresAt = expiresAt;
        user.save();
    }

    return newAccessToken ? newAccessToken : accessToken;
};

module.exports = lookUpAccessToken;
