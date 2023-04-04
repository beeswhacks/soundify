const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userName: String,
    sessionId: String,
    accessToken: String,
    refreshToken: String,
    expiresAt: Date,
});

const Users = mongoose.model('Users', userSchema);

module.exports = Users;
