require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();


app.use(express.json);

app.listen(3000, ()  => {
    console.log('server Started at ${3000}');
})

require('dotenv').config();

const mongoString = process.env.DATABASE_URL;

mongoose.connect(mongoString);
const database = mongoose.connection;

database.on('error', (error) => {
    console.log(error);
})

database.once('connexted', () =>{
    console.log('Database Connected');
})