const express = require('express');
const router = express.Router();
var cors = require('cors');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const querystring = require('node:querystring');
const axios = require('axios');
const { get } = require('lodash');

const getAccessToken = require('./services/getAccessToken');
const getUserInfo = require('./services/getUserInfo');
const getTracklist = require('./services/getShowInfo');
const makeSpotifyApiCall = require('./services/makeSpotifyApiCall');

const state = process.env.STATE || null;
const redirect_uri = 'http://localhost:3000/api/loginRedirect';
const client_id = process.env.CLIENT_ID || null;
const client_secret = process.env.CLIENT_SECRET || null;
const spotify_accounts_base_url = 'https://accounts.spotify.com/';
const spotify_api_base_url = 'https://api.spotify.com/v1/';

// authorise user through Spotify API
router.get('/api/login', cors(), (req, res) => {
    const scope =
        'user-read-private user-read-email playlist-read-private playlist-modify-private playlist-modify-public';

    // redirect login request to Spotify API
    res.redirect(
        spotify_accounts_base_url +
            'authorize?' +
            querystring.stringify({
                response_type: 'code',
                client_id: client_id,
                scope: scope,
                redirect_uri: redirect_uri,
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
        const { accessToken, tokenExpiresIn } = await getAccessToken(
            spotify_accounts_base_url,
            code,
            redirect_uri,
            client_id,
            client_secret
        );

        if (accessToken) {
            // expires_in gives expiration time in seconds, maxAge requires milliseconds
            const maxCookieAgeInSeconds = tokenExpiresIn * 1000;
            res.cookie('access_token', accessToken, {
                maxAge: maxCookieAgeInSeconds,
            })
                .cookie('access_token_granted', true, {
                    maxAge: maxCookieAgeInSeconds,
                })
                .redirect(`/api/getUserName/${maxCookieAgeInSeconds}`);
        } else {
            res.cookie('access_token_granted', false).redirect('/');
        }
    }

    if (error) {
        console.error('ERROR: Could not connect to spotify. Reason:', error);
    }
});

router.get('/api/getUserName/:maxCookieAge', cors(), async (req, res) => {
    const access_token = req.cookies.access_token;

    if (!access_token) {
        res.status(500).send(
            'An access token is required to get user info but none was provided.'
        );
    } else {
        const userInfo = await getUserInfo(spotify_api_base_url, access_token);
        res.cookie('user_name', userInfo.data.display_name, {
            maxAge: req.params.maxCookieAge,
        }).redirect('/');
    }
});

router.post('/api/:showId', cors(), async (req, res) => {
    const access_token = req.cookies.access_token;

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
    const userInfo = await getUserInfo(spotify_api_base_url, access_token);
    const spotifyUserId = userInfo.data.id;

    // check if user already has playlist for the show
    const userPlaylists = await makeSpotifyApiCall(
        spotify_api_base_url,
        access_token,
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
            spotify_api_base_url,
            access_token,
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
            spotify_api_base_url,
            access_token,
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
            spotify_api_base_url,
            access_token,
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

module.exports = router;
