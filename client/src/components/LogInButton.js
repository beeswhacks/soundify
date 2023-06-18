import Cookies from 'js-cookie';

const LogInButton = () => {
    let buttonText = 'Connect to Spotify';
    const sessionId = Cookies.get('sessionId');

    if (sessionId) {
        const userName = Cookies.get('user_name');
        buttonText = `Connected as ${userName}`;
    }

    return (
        <div>
            <a
                href="/api/login"
                className="round-button bg-green text-black normalise-font-size"
            >
                {buttonText}
            </a>
        </div>
    );
}

export default LogInButton;
