const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
    userName: String,
    spotifyId: String,
	name: String,
	url: String,
    imageUrl: String,
});

const Playlist = mongoose.model('Playlist', playlistSchema);

module.exports = Playlist;
