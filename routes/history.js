const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Playlist = require('../models/Playlist');

router.get('/getUserHistory', async (req, res) => {
    const userName = req.cookies['user_name'];

    if (!userName) {
        throw new Error('Could not get user name from cookie. Try going back and reconnecting to Spotify.')
    }

    const playlists = await Playlist.find({ userName }).lean();

    res.json(playlists);
})

module.exports = router;
