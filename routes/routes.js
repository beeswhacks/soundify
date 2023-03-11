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

// authorise user through Spotify API
router.get('/api/login', cors(), (req, res) => {
    const scope = 'user-read-private user-read-email';

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

    async function getAccessTokenResponse(code, redirect_uri, client_id, client_secret) {
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
        return response;
    }

    if (responseState !== state) {
        throw new Error('State received in redirection URI does not match state ' +
            'provided to Spotify in authorisation URI.');
    } else {
        const accessTokenResponse = await getAccessTokenResponse(code, redirect_uri, client_id, client_secret);
        if (accessTokenResponse.data.access_token) {
            res.cookie('access_token', accessTokenResponse.data.access_token, {
                    // expires_in gives expiration time in seconds, maxAge requires milliseconds
                    maxAge: accessTokenResponse.data.expires_in * 1000,
                })
                .cookie('access_token_granted', true, {
                    maxAge: accessTokenResponse.data.expires_in * 1000,
                })
                .redirect('/api/getUserInfo');
        } else {
            res.cookie('access_token_granted', false).redirect('/');
        }
    }

    if (error !== null) {
        console.error('ERROR: Could not connect to spotify. Reason:', error);
    }
});

router.get('/api/getUserInfo', cors(), async (req, res) => {
    const access_token = req.cookies.access_token;

    if (!access_token) {
        res.status(500).send('An access token is required to get user info but none was provided.');
    } else {
        const userInfo = await axios({
            baseURL: spotify_api_base_url,
            url: '/me',
            method: 'get',
            headers: {
                'Authorization': 'Bearer ' + access_token,
                'Content-Type': 'application/json',
            }
        });
        // res.json(userInfo);
        res.cookie('user_name', userInfo.data.display_name).redirect('/');
    }
});

router.post('/api/:showId', cors(), async (req, res) => {

    // let tracklist;
    const url = 'https://www.bbc.co.uk/sounds/play/' + req.params.showId;

    // scrape data from BBC Sounds
    const bbcSoundsData = await JSDOM.fromURL(url, { resources: 'usable' })
        .then(dom => {
            const scripts = dom.window.document.querySelectorAll('body script');
            const searchText = 'window.__PRELOADED_STATE__ = '
            var isolatedScript = '';
            scripts.forEach(script => {
                const trimmedScript = script.text.trim();
                if (trimmedScript.slice(0, searchText.length) === searchText) {
                    isolatedScript = trimmedScript.slice(searchText.length, -1);
                }
            });
            return isolatedScript;
        })
        .then(isolatedScript => {
            scriptJSON = JSON.parse(isolatedScript);
            return scriptJSON;
        })
        .catch(err => {
            console.error(err);
            if (err) { res.sendStatus(500) };
        });

    const tracklist = bbcSoundsData.tracklist;
    console.log(JSON.stringify(bbcSoundsData, null, 2));

    // tracklist.tracks[1].uris[0].uri

    // extract show title and release date for Spotify playlist title

    // get user's Spotify user_id

    // create spotify playlist from bbc sounds tracklist

    // add songs to playlist

    // send link to playlist to front end?
});

module.exports = router;
