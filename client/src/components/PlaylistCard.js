import css from './PlaylistCard.module.css';

const PlaylistCard = (props) => {
    const { name, url, image } = props;

    return (
        <a className={css.playlist} href={url}>
            <span>
                <img
                    alt="playlist artwork"
                    width="75"
                    height="75"
                    src={image}
                />
            </span>
            <span style={{ textDecoration: 'none', margin: '10px' }}>
                {name}
            </span>
        </a>
    );
};

export default PlaylistCard;
