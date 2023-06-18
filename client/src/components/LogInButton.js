import Cookies from 'js-cookie';
import css from './LogInButton.module.css';

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
                className={css.button}
            >
                {buttonText}
            </a>
        </div>
    );
}

export default LogInButton;
