# soundify
Create a Spotify playlist from a tracklist on BBC Sounds.

# Cloning the repo
1. Create a [Spotify developer](https://developer.spotify.com/) account.

2. Create a `.env` file in the root directory with the following variables:

| **Variable**    | **Description** |
| :-------------- | :-------------- |
| `PORT` | Port to run the server on |
| `STATE` | See the Spotify docs for the [authorisation code flow](https://developer.spotify.com/documentation/general/guides/authorization/code-flow/). You supply a value for state, which is included in your user authorisation request to the Spotify API. The value is returned back to you and you can compare it as a security check against cross-site request forgery. |
| `CLIENT_ID` | See the Spotify docs for the [authorisation code flow](https://developer.spotify.com/documentation/general/guides/authorization/code-flow/). This identifies you Spotify developer application. |
| `CLIENT_SECRET` | See the Spotify docs for the [authorisation code flow](https://developer.spotify.com/documentation/general/guides/authorization/code-flow/). This is the key you use to authorise your requests to the Spotify API. |

3. Create a `.env` file in the `/client` directory with a variable named `REACT_APP_SERVER_PORT`. The React app is set up to proxy requests to relative URLs it doesn't recognise to the server side. This tells the proxy which port your server is running on.

# TODO
- [ ] Randomise state for Spotify authorisation
- [ ] Implement refreshing of access token
- [x] ~~Add indicator to show when user has connected to Spotify successfully~~
- [x] ~~Show user's name when connected~~
- [ ] Add hyperlink to returned playlist
- [x] ~~Handle playlist already existing properly~~
- [x] ~~Improve UI~~
