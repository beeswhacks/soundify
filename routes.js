const express = require('express');
const router = express.Router();
var cors = require('cors');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const querystring = require('node:querystring');
const axios = require('axios');

const state = process.env.STATE || null;
const redirect_uri = 'http://localhost:3000/api/loginRedirect';
const client_id = process.env.CLIENT_ID || null;
const client_secret = process.env.CLIENT_SECRET || null;
const spotify_accounts_base_url = 'https://accounts.spotify.com/';
const spotify_api_base_url = 'https://api.spotify.com/v1/';

function getUserInfo(access_token) {
    return (
        axios({
            baseURL: spotify_api_base_url,
            url: '/me',
            method: 'get',
            headers: {
                'Authorization': 'Bearer ' + access_token,
                'Content-Type': 'application/json',
            },
        })
    );
}

const makeSpotifyApiCall = (access_token, options) => {
    const {method, url, ...otherOptions} = options;

    return (
        axios({
            baseURL: spotify_api_base_url,
            headers: {
                'Authorization': 'Bearer ' + access_token,
                'Content-Type': 'application/json',
            },
            method,
            url,
            ...otherOptions,
        })
    )
}

// authorise user through Spotify API
router.get('/api/login', cors(), (req, res) => {
    const scope = 'user-read-private user-read-email playlist-read-private playlist-modify-private playlist-modify-public';

    // redirect login request to Spotify API
    res.redirect(spotify_accounts_base_url + 'authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }))
});

// Spotify API redirects here after user has logged in
router.get('/api/loginRedirect', cors(), async (req, res) => {

    const responseState = req.query.state || null;
    const code = req.query.code || null;
    const error = req.query.error || null;

    async function getAccessToken(code, redirect_uri, client_id, client_secret) {
        const response = await axios({
            baseURL: spotify_accounts_base_url,
            url: '/api/token',
            method: 'post',
            data: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (Buffer.from(client_id + ':' +
                    client_secret)).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
        });
        return {
            accessToken: response.data.access_token,
            tokenExpiresIn: response.data.expires_in,
        }
    }

    if (responseState !== state) {
        throw new Error('State received in redirection URI does not match state ' +
            'provided to Spotify in authorisation URI.');
    } else {
        const { accessToken, tokenExpiresIn } = await getAccessToken(
            code,
            redirect_uri,
            client_id,
            client_secret);

        if (accessToken) {
            // expires_in gives expiration time in seconds, maxAge requires milliseconds
            const maxCookieAgeInSeconds = tokenExpiresIn * 1000
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

    if (error !== null) {
        console.error('ERROR: Could not connect to spotify. Reason:', error);
    }
});

router.get('/api/getUserName/:maxCookieAge', cors(), async (req, res) => {
    const access_token = req.cookies.access_token;

    if (!access_token) {
        res.status(500).send('An access token is required to get user info but none was provided.');
    } else {
        const userInfo = await getUserInfo(access_token);
        res.cookie('user_name', userInfo.data.display_name, {
            maxAge: req.params.maxCookieAge,
        })
            .redirect('/');
    }
});

router.post('/api/:showId', cors(), async (req, res) => {
    const access_token = req.cookies.access_token;

    // let tracklist;
    const url = 'https://www.bbc.co.uk/sounds/play/' + req.params.showId;

    // scrape data from BBC Sounds
    const bbcSoundsData = await JSDOM
        .fromURL(url, { resources: 'usable' })
        .then(dom => {
            const scripts = dom.window.document.querySelectorAll('body script');
            const searchText = 'window.__PRELOADED_STATE__ = '
            // look for searchText in each script
            var isolatedScript = '';
            scripts.forEach(script => {
                const trimmedScript = script.text.trim();
                if (trimmedScript.slice(0, searchText.length) === searchText) {
                    return isolatedScript = trimmedScript.slice(searchText.length, -1);
                }
            });
            return isolatedScript;
        })
        .then(isolatedScript => {
            scriptJSON = JSON.parse(isolatedScript);
            return scriptJSON;
        });

    const tracklist = bbcSoundsData.tracklist.tracks;

    // each track has a set of URIs pointing to the track on apple music and/or spotify
    // go through the URIs for each track and only return spotify URIs
    const spotifyUriObjects = tracklist.flatMap(track => {
        return track.uris.filter(uri => uri.id === 'commercial-music-service-spotify');
    });

    // each uri is a link of the form https://open.spotify.com/track/<spotifyId>
    // create new URL object for each uri and extract the last section of the href to get spotifyId
    // the spotifyId identifies the spotify track so can be used to find the song and add it to a playlist
    const spotifyUris = spotifyUriObjects.flatMap(uriObj => {
        const uri = new URL(uriObj.uri);
        const spotifyId = uri.href.substring(uri.href.lastIndexOf('/') + 1);
        return 'spotify:track:' + spotifyId;
    })

    // extract show title and release date for Spotify playlist title
    const showTitle = bbcSoundsData.modules.data[0].data[0].titles.primary;
    const releaseDate = new Date(bbcSoundsData.modules.data[0].data[0].release.date);
    const playlistName = showTitle + ' - ' + releaseDate.toDateString();

    // get user's Spotify user_id
    const userInfo = await getUserInfo(access_token);
    const spotifyUserId = userInfo.data.id;

    // check if user already has playlist for the show
    const userPlaylists = await makeSpotifyApiCall(access_token, {
        method: 'get',
        url: '/me/playlists',
    })

    const matchingPlaylists = userPlaylists.data.items.some(playlist => playlist.name == playlistName);

    // create spotify playlist from bbc sounds tracklist
    if (matchingPlaylists === false) {
        const newPlaylist = await makeSpotifyApiCall(access_token, {
            method: 'post',
            url: `/users/${spotifyUserId}/playlists`,
            data: {
                "name": playlistName,
                "description": "Auto-generated using Soundify",
                "public": false,
            }
        })

        const addTracksToPlaylist = await makeSpotifyApiCall(access_token, {
            url: `/playlists/${newPlaylist.data.id}/tracks`,
            method: 'post',
            data: {
                "uris": spotifyUris,
                "position": 0,
            }
        })

        const newPlaylistImage = await makeSpotifyApiCall(access_token, {
            url: `playlists/${newPlaylist.data.id}/images`,
            method: 'get',
        })

        res.json({
            isCreated: true,
            url: newPlaylist.data.external_urls.spotify,
            name: newPlaylist.data.name,
            images: newPlaylistImage.data,
        })
    } else {
        // if the playlist already exists, return info to the user
        const matchingPlaylist = userPlaylists.data.items.find(playlist => playlist.name == playlistName);

        res.json({
            isCreated: false,
            url: matchingPlaylist.external_urls.spotify,
            name: matchingPlaylist.name,
            images: matchingPlaylist.images,
        })
    }
});

module.exports = router;
