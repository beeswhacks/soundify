const cookieParser = require('cookie-parser');
const express = require('express');
const app = express();
const morgan = require('morgan');
const mongoose = require('mongoose');
require('dotenv').config();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(morgan('tiny'));
app.use(cookieParser());
app.listen(PORT);

mongoose
    .connect('mongodb://localhost:27017')
    .then(console.log('Connected to MongoDB.'));

const routes = require('./routes.js');
app.use(routes);
