import './App.css';
import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

function LogIn({ accessTokenProp }) {
    const [buttonText, setButtonText] = useState('Connect to Spotify');
    const [hasAccessToken, setHasAccessToken] = useState('');

    useEffect(() => {
        setHasAccessToken(Cookies.get('access_token_granted'));

        if (hasAccessToken) {
            const userName = Cookies.get('user_name');
            setButtonText(`Connected as ${userName}`);
        } else {
            setButtonText('Connect to Spotify');
        }
    }, [hasAccessToken]);

    return (
        <div>
            <a href='/api/login' className='round-button bg-green text-black normalise-font-size'>{buttonText}</a>
        </div>
    )
}

function URLGetter() {

    const [feedback, setFeedback] = useState('');

    function handleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        try {
            const url = new URL(formData.get('url'));
            const showId = url.href.substring(url.href.lastIndexOf('/') + 1);
            setFeedback('Generating playlist...');
            fetch('/api/' + showId, {
                method: 'POST'
            }).then(response => response.json())
                .then(data => console.log(data));
        } catch (error) {
            setFeedback(
                'The URL provided is incorrectly formatted. Make sure it is formatted like this: ' +
                'https://www.bbc.co.uk/sounds/play/<showId>'
            )
        }
    }

    return (
        <>
            <form onSubmit={handleSubmit}>
                <label className='text-white'>
                    Paste BBC sounds URL below:<br />
                    <input id='url' name='url' />
                </label>
                <button type='submit'>Get playlist</button>
            </form>
            <div className='wrap-text text-white'>
                {feedback}
            </div>
        </>
    )
}

function App() {
    return (
        <div className="App bg-black">
            <div className='main'>
                <LogIn />
                <div className='title'>
                    Soundify
                </div>
                <URLGetter />
            </div>
        </div>
    );
}

export default App;
