const cookieParser = require('cookie-parser');
const express = require('express');
const app = express();
const morgan = require('morgan');
const mongoose = require('mongoose');
require('dotenv').config();
const PORT = process.env.PORT || 5000;

app.use(express.static('client/build'));
app.use(express.json());
app.use(morgan('tiny'));
app.use(cookieParser());
app.listen(PORT);

mongoose
    .connect(process.env.MONGODB_URI)
    .then(console.log('Connected to MongoDB.'));

app.use('/api', require('./routes/routes'));
app.use('/', require('./routes/serveReactApp'));
