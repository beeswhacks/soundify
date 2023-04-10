const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userName: String,
    sessionId: String,
    accessToken: String,
    refreshToken: String,
    expiresAt: Date,
});

const User = mongoose.model('User', userSchema);

module.exports = User;
