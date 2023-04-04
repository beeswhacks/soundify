const expiresAt = (tokenExpiresIn) => {
    return new Date(Date.now() + (tokenExpiresIn * 1000))
}

module.exports = expiresAt;
