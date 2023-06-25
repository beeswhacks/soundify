import useFetch from 'use-http';
import PlaylistCard from './components/PlaylistCard';
import css from './HistoryPage.module.css';

const HistoryPage = (props) => {
    const { data = [], loading, error } = useFetch('/api/history/getUserHistory', {}, []);

    return (
        <div className={css.playlistListContainer}>
            {loading && <div className={css.playlistListContainer}>Loading...</div>}
            {error && (
                <div className={css.playlistListContainer}>
                    Woopsie! We couldn't fetch your playlists.
                </div>
            )}
            {data.map((p) => {
                return <PlaylistCard name={p.name} image={p.imageUrl} url={p.url} />;
            })}
        </div>
    );
};

export default HistoryPage;
