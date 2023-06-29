const axios = require('axios');
const cors = require('cors');
const express = require('express');
const { get } = require('lodash');
const { JSDOM } = require('jsdom');
const path = require('path');
const querystring = require('node:querystring');
const randomstring = require('randomstring');
const router = express.Router();

const expiresAt = require('../services/expiresAt');
const getAccessToken = require('../services/getAccessToken');
const getUserInfo = require('../services/getUserInfo');
const getTracklist = require('../services/getShowInfo');
const makeSpotifyApiCall = require('../services/makeSpotifyApiCall');
const lookUpAccessToken = require('../services/lookUpAccessToken');

const User = require('../models/User');
const Playlist = require('../models/Playlist');

const state = randomstring.generate();
const redirectUri = `${process.env.APP_URL}/api/loginRedirect`;
const clientId = process.env.CLIENT_ID || null;
const clientSecret = process.env.CLIENT_SECRET || null;
const spotifyAccountsBaseUrl = 'https://accounts.spotify.com/';
const spotifyApiBaseUrl = 'https://api.spotify.com/v1/';

// authorise user through Spotify API
router.get('/login', cors(), (req, res) => {
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
router.get('/loginRedirect', cors(), async (req, res) => {
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
            // TODO: change to upsert to avoid duplicates per user
            await User.create({
                userName: '',
                sessionId,
                accessToken,
                refreshToken,
                expiresAt: expiresAt(tokenExpiresIn),
            });
            res.cookie('sessionId', sessionId).redirect(`getUserName`);
        } else {
            res.cookie('sessionId', false).redirect('/');
        }
    }

    if (error) {
        console.error('ERROR: Could not connect to spotify. Reason:', error);
    }
});

router.get('/getUserName', cors(), async (req, res) => {
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

router.post('/createPlaylist/:showId', cors(), async (req, res) => {
    const sessionId = req.cookies.sessionId;
    const userName = req.cookies['user_name'];

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

    // get access token from session id
    const accessToken = await lookUpAccessToken(
        sessionId,
        spotifyAccountsBaseUrl,
        clientId,
        clientSecret
    );

    // check if user already has playlist for the show
    const userPlaylists = await makeSpotifyApiCall(
        spotifyApiBaseUrl,
        accessToken,
        {
            method: 'get',
            url: '/me/playlists',
        }
    );

    const matchingPlaylist = userPlaylists.data.items.find(
        (playlist) => playlist.name == playlistName
    );

    // create spotify playlist from bbc sounds tracklist
    if (!matchingPlaylist) {
        const newPlaylist = await makeSpotifyApiCall(
            spotifyApiBaseUrl,
            accessToken,
            {
                method: 'post',
                url: `/users/${userName}/playlists`,
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

        // add playlist to Playlists collection
        await Playlist.create({
            userName,
            spotifyId: newPlaylist.data.id,
            name: newPlaylist.data.name,
            url: newPlaylist.data.external_urls.spotify,
            imageUrl: newPlaylistImage.data[1].url,
        });

        res.json({
            isCreated: true,
            url: newPlaylist.data.external_urls.spotify,
            name: newPlaylist.data.name,
            // TODO: change this so that it only returns one image instead of all images
            images: newPlaylistImage.data,
        });
    } else {
        // add matching playlist to user history if it's not already there
        await Playlist.findOneAndUpdate(
            { userName, name: playlistName },
            {
                userName,
                spotifyId: matchingPlaylist.id,
                name: matchingPlaylist.name,
                url: matchingPlaylist.external_urls.spotify,
                imageUrl: matchingPlaylist.images[1].url,
            },
            { upsert: true }
        )

        res.json({
            isCreated: false,
            url: matchingPlaylist.external_urls.spotify,
            name: matchingPlaylist.name,
            images: matchingPlaylist.images,
        });
    }
});

module.exports = router;
