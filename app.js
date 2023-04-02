const cookieParser = require('cookie-parser');
const express = require('express');
const app = express();
const morgan = require('morgan');
require('dotenv').config();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(morgan('tiny'));
app.use(cookieParser());
app.listen(PORT);

const routes = require('./routes.js')
app.use(routes);
