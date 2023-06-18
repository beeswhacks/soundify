import LogInButton from './components/LogInButton';
import CreatePlaylistForm from './components/CreatePlaylistForm';
import css from './HomePage.module.css';

const HomePage = (props) => {
    return (
        <div className={css.marginAuto}>
            <LogInButton />
            <div className={css.title}>Soundify</div>
            <CreatePlaylistForm />
        </div>
    )
}

export default HomePage;
