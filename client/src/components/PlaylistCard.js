const PlaylistCard = (props) => {
    const { name, url, image } = props;

    return (
        <a className="text-white playlist" href={url}>
            <span>
                <img
                    alt="playlist artwork"
                    width="75"
                    height="75"
                    src={image}
                />
            </span>
            <span
                className="text-white"
                style={{ textDecoration: 'none', margin: '10px' }}
            >
                {name}
            </span>
        </a>
    );
};

export default PlaylistCard;
