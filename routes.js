const express = require('express');
const router = express.Router();
var cors = require('cors');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const querystring = require('node:querystring');
const axios = require('axios');
const { get } = require('lodash');
const randomstring = require('randomstring');
const path = require('path');

const expiresAt = require('./services/expiresAt');
const getAccessToken = require('./services/getAccessToken');
const getUserInfo = require('./services/getUserInfo');
const getTracklist = require('./services/getShowInfo');
const makeSpotifyApiCall = require('./services/makeSpotifyApiCall');
const lookUpAccessToken = require('./services/lookUpAccessToken');

const User = require('./models/User');

const state = randomstring.generate();
const redirectUri = process.env.REDIRECT_URI || null;
const clientId = process.env.CLIENT_ID || null;
const clientSecret = process.env.CLIENT_SECRET || null;
const spotifyAccountsBaseUrl = 'https://accounts.spotify.com/';
const spotifyApiBaseUrl = 'https://api.spotify.com/v1/';

// authorise user through Spotify API
router.get('/api/login', cors(), (req, res) => {
    const scope =
        'user-read-private user-read-email playlist-read-private playlist-modify-private playlist-modify-public';

    // redirect login request to Spotify API
    res.redirect(
        spotifyAccountsBaseUrl +
            'authorize?' +
            querystring.stringify({
                response_type: 'code',
                client_id: clientId,
                scope: scope,
                redirect_uri: redirectUri,
                state: state,
            })
    );
});

// Spotify API redirects here after user has logged in
router.get('/api/loginRedirect', cors(), async (req, res) => {
    const responseState = get(req, 'query.state');
    const code = get(req, 'query.code');
    const error = get(req, 'query.error');

    if (responseState !== state) {
        throw new Error(
            'State received in redirection URI does not match state provided to Spotify in authorisation URI.'
        );
    } else {
        const { accessToken, refreshToken, tokenExpiresIn } =
            await getAccessToken(
                spotifyAccountsBaseUrl,
                code,
                redirectUri,
                clientId,
                clientSecret
            );

        if (accessToken) {
            const sessionId = randomstring.generate();
            await User.create({
                userName: '',
                sessionId,
                accessToken,
                refreshToken,
                expiresAt: expiresAt(tokenExpiresIn),
            });
            res.cookie('sessionId', sessionId).redirect(`/api/getUserName`);
        } else {
            res.cookie('sessionId', false).redirect('/');
        }
    }

    if (error) {
        console.error('ERROR: Could not connect to spotify. Reason:', error);
    }
});

router.get('/api/getUserName', cors(), async (req, res) => {
    const sessionId = req.cookies.sessionId;

    const accessToken = await lookUpAccessToken(
        sessionId,
        spotifyAccountsBaseUrl,
        clientId,
        clientSecret
    );

    if (!accessToken) {
        res.status(500).send('Access token not found.');
    } else {
        const userInfo = await getUserInfo(spotifyApiBaseUrl, accessToken);
        const userName = userInfo.data.display_name;

        const user = await User.findOne({
            sessionId,
        }).exec();

        user.userName = userName;
        await user.save();

        res.cookie('user_name', userName).redirect('/');
    }
});

router.post('/api/:showId', cors(), async (req, res) => {
    const sessionId = req.cookies.sessionId;

    const accessToken = await lookUpAccessToken(
        sessionId,
        spotifyAccountsBaseUrl,
        clientId,
        clientSecret
    );

    // ----------------------------------------------------------------
    //              EXTRACT TRACKLIST FROM BBC SOUNDS
    // ----------------------------------------------------------------

    const url = 'https://www.bbc.co.uk/sounds/play/' + req.params.showId;

    // scrape data from BBC Sounds
    const { tracklist, playlistName } = await getTracklist(url);

    // pick out links to Spotify tracks
    const spotifyUriObjects = tracklist.flatMap((track) => {
        return track.uris.filter(
            (uri) => uri.id === 'commercial-music-service-spotify'
        );
    });

    // links are of the form https://open.spotify.com/track/<spotifyId>
    // extract spotifyIds from links
    const spotifyUris = spotifyUriObjects.flatMap((uriObj) => {
        const uri = new URL(uriObj.uri);
        const spotifyId = uri.href.substring(uri.href.lastIndexOf('/') + 1);
        return `spotify:track:${spotifyId}`;
    });

    // ----------------------------------------------------------------
    //                   CREATE SPOTIFY PLAYLIST
    // ----------------------------------------------------------------

    // get user's Spotify user_id
    const userInfo = await getUserInfo(spotifyApiBaseUrl, accessToken);
    const spotifyUserId = userInfo.data.id;

    // check if user already has playlist for the show
    const userPlaylists = await makeSpotifyApiCall(
        spotifyApiBaseUrl,
        accessToken,
        {
            method: 'get',
            url: '/me/playlists',
        }
    );

    const matchingPlaylist = userPlaylists.data.items.some(
        (playlist) => playlist.name == playlistName
    );

    // create spotify playlist from bbc sounds tracklist
    if (!matchingPlaylist) {
        const newPlaylist = await makeSpotifyApiCall(
            spotifyApiBaseUrl,
            accessToken,
            {
                method: 'post',
                url: `/users/${spotifyUserId}/playlists`,
                data: {
                    name: playlistName,
                    description: 'Auto-generated using Soundify',
                    public: false,
                },
            }
        );

        const addTracksToPlaylist = await makeSpotifyApiCall(
            spotifyApiBaseUrl,
            accessToken,
            {
                method: 'post',
                url: `/playlists/${newPlaylist.data.id}/tracks`,
                data: {
                    uris: spotifyUris,
                    position: 0,
                },
            }
        );

        const newPlaylistImage = await makeSpotifyApiCall(
            spotifyApiBaseUrl,
            accessToken,
            {
                method: 'get',
                url: `playlists/${newPlaylist.data.id}/images`,
            }
        );

        res.json({
            isCreated: true,
            url: newPlaylist.data.external_urls.spotify,
            name: newPlaylist.data.name,
            images: newPlaylistImage.data,
        });
    } else {
        // if the playlist already exists, return it to the user
        const matchingPlaylist = userPlaylists.data.items.find(
            (playlist) => playlist.name == playlistName
        );

        res.json({
            isCreated: false,
            url: matchingPlaylist.external_urls.spotify,
            name: matchingPlaylist.name,
            images: matchingPlaylist.images,
        });
    }
});

router.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

module.exports = router;
