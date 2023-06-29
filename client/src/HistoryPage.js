import PlaylistCard from './components/PlaylistCard';
import css from './HistoryPage.module.css';
import { useEffect, useState } from 'react';

const HistoryPage = (props) => {
    const [status, setStatus] = useState('loading');
    const [data, setData] = useState([]);

    useEffect(() => {
        fetch('/api/history/getUserHistory')
            .then((response) => response.json())
            .then((data) => {
                setData(data);
                setStatus('success');
            })
            .catch((err) => {
                console.log(err);
                setStatus('failed');
            });
    }, []);

    return (
        <div className={css.playlistListContainer}>
            {status === 'loading' && <div className={css.playlistListContainer}>Loading...</div>}
            {status === 'failed' && (
                <div className={css.playlistListContainer}>
                    Woopsie! We couldn't fetch your playlists.
                </div>
            )}
            {status === 'success' && data.map((p) => {
                return <PlaylistCard name={p.name} image={p.imageUrl} url={p.url} />;
            })}
        </div>
    );
};

export default HistoryPage;
