const { JSDOM } = require('jsdom');

async function getTracklist(url) {
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
    const showTitle = bbcSoundsData.modules.data[0].data[0].titles.primary;
    const releaseDate = new Date(bbcSoundsData.modules.data[0].data[0].release.date);
    const playlistName = showTitle + ' - ' + releaseDate.toDateString();
    return { tracklist, showTitle, releaseDate, playlistName };
}

module.exports = getTracklist;
