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

// redirect login request to Spotify API
router.get('/api/login', cors(), (req, res) => {

    const scope = 'user-read-private user-read-email';

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }))
});

// Spotify API redirects here after login request has been handled
router.get('/api/loginRedirect', cors(), async (req, res) => {

    const responseState = req.query.state || null;
    const code = req.query.code || null;
    const error  = req.query.error || null;

    async function getAccessTokenResponse(code, redirect_uri, client_id, client_secret) {
        try {
            const response = await axios({
                url: 'https://accounts.spotify.com/api/token',
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
        } catch (err) {
            console.error('Error getting access token: \n', err);
        }
    } 

    if (responseState !== state) {
        throw new Error('State received in redirection URI does not match state ' +
        'provided to Spotify in authorisation URI.');
    } else {
        const accessTokenResponse = await getAccessTokenResponse(code, redirect_uri, client_id, client_secret);
        res.cookie('access_token', accessTokenResponse.data.access_token, {
            maxAge: accessTokenResponse.data.expires_in,
            httpOnly: true,
        }).redirect('/');
    }

    if (error !== null) {
        console.error('ERROR: Could not connect to spotify. Reason:', error);
    }
})

router.post('/api/:showId', cors(), (req, res) => {

    let tracklist;
    const url = 'https://www.bbc.co.uk/sounds/play/' + req.params.showId;
    JSDOM.fromURL(url, {resources: 'usable'})
        .then(dom => {
            const scripts = dom.window.document.querySelectorAll('body script');
            const searchText = 'window.__PRELOADED_STATE__ = '
            var isolatedScript = '';
            scripts.forEach(script => {
                const trimmedScript = script.text.trim();
                if (trimmedScript.slice(0,searchText.length) === searchText) {
                    isolatedScript = trimmedScript.slice(searchText.length, -1);
                }    
            });    
            return isolatedScript;
        })    
        .then(isolatedScript => {
            scriptJSON = JSON.parse(isolatedScript);
            tracklist = scriptJSON.tracklist;
            console.log(tracklist)
            return tracklist;
        })    
        .then(tracklist => res.json(tracklist))
        .catch(err => {
            if (err) {res.sendStatus(500)};
        });    
});        

module.exports = router;