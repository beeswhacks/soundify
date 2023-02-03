const express = require('express');
const router = express.Router();
var cors = require('cors');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

router.post('/api/:showId', cors(), (req, res) => {
    var tracklist;
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
            tracklist = scriptJSON.tracklist
            return tracklist
        })
        .then(tracklist => res.json(tracklist))
        .catch(err => {
            if (err) {res.sendStatus(500)};
        });
});

module.exports = router;