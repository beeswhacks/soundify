const express = require('express');
const router = express.Router();
var cors = require('cors');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const querystring = require('node:querystring');

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
router.get('/api/loginRedirect', (req, res) => {

    const responseState = req.query.state || null;
    const code = req.query.code || null;
    const error  = req.query.error || null;

    async function getAccessTokenResponse(code, redirect_uri, client_id, client_secret) {
        try {
            const response = await fetch('https://accounts.spotify.com/api/token?', {
                method: 'POST',
                body: querystring.stringify({
                    code: code,
                    redirect_uri: redirect_uri,
                    grant_type: 'authorization_code'
                }),
                headers: {
                    'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + 
                    client_secret)).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                json: true
            });

            const accessTokenResponse = await response.json();
            console.log(accessTokenResponse);
            return accessTokenResponse;
        } catch (err) {
            console.error(err);
        }
    } 

    if (responseState !== state) {
        throw new Error('State received in redirection URI does not match state ' +
        'provided to Spotify in authorisation URI.');
    } else {
        getAccessToken(code, redirect_uri, client_id, client_secret);
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