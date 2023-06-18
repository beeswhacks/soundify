import { useState } from 'react';
import Cookies from 'js-cookie';
import { isEmpty } from 'lodash';
import spotifyIcon from '../Spotify_Icon_RGB_Green.png';

import PlaylistCard from './PlaylistCard';

const CreatePlaylistForm = () => {
    const [status, setStatus] = useState('');

    let feedbackText = '';

    if (status === 'notConnected') {
        feedbackText = "It looks like you're not connected to Spotify. Connect to Spotify and try again.";
    } else if (status === 'generatingPlaylist') {
        feedbackText = 'Generating playlist...';
    } else if (status === 'playlistExists') {
        feedbackText = 'It looks like a playlist already exists for this show:';
    } else if (status === 'playlistCreated') {
        feedbackText = "Done! Here's your playlist:";
    } else if (status === 'errorCreatingPlaylist') {
        feedbackText = 'Unable to generate playlist. Please make sure that the URL points to an existing BBC Sounds show and that the show has a tracklist.';
    } else if (status === 'badUrl') {
        feedbackText = 'The URL provided is incorrectly formatted. Make sure it is formatted like this: https://www.bbc.co.uk/sounds/play/<showId>';
    }

    function handleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        Cookies.remove('playlist_url');

        if (!Cookies.get('sessionId')) {
            setStatus('notConnected');
        } else {
            try {
                const url = new URL(formData.get('url'));
                const showId = url.href.substring(url.href.lastIndexOf('/') + 1);
                setStatus('generatingPlaylist');

                fetch('/api/' + showId, {
                    method: 'POST',
                })
                    .then((response) => response.json())
                    .then((data) => {
                        if (Object.hasOwn(data, 'isCreated')) {
                            data.isCreated
                                ? setStatus('playlistCreated')
                                : setStatus('playlistExists');
                            sessionStorage.setItem('playlistName', String(data.name));
                            sessionStorage.setItem('playlistUrl', data.url);
                            sessionStorage.setItem('playlistImage', isEmpty(data.images)
                                ? spotifyIcon
                                : data.images[1].url);
                        }
                    })
                    .catch((error) => {
                        console.error(error);
                        setStatus('errorCreatingPlaylist');
                    });
            } catch (error) {
                setStatus('badUrl');
            }
        }
    }

    return (
        <>
            <form onSubmit={handleSubmit}>
                <label className="text-white">
                    Paste a BBC sounds URL below:
                    <br />
                    <input id="url" name="url" />
                </label>
                <button type="submit" id="submit-button">
                    Get playlist
                </button>
            </form>
            {status === 'playlistCreated' || status === 'playlistExists' ? (
                <PlaylistCard
                    name={sessionStorage.getItem('playlistName')}
                    url={sessionStorage.getItem('playlistUrl')}
                    image={sessionStorage.getItem('playlistImage')}
                />
            ) : (
                <div className="wrap-text text-white">{feedbackText}</div>
            )}
        </>
    );
};

export default CreatePlaylistForm;
