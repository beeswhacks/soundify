const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:' + process.env.REACT_APP_SERVER_PORT,
      changeOrigin: true,
    })
  );
};
