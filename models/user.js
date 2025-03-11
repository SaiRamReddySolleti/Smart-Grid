const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: String,
    username: String,
    password: String,
    role: String
});
const DataSchema = new mongoose.Schema({
    date: String,
    time: String,
    'use[kw]': Number,
    'gen[kw]': Number,
    userid: String
});

module.exports = {
    User: mongoose.model('User', UserSchema),
    Data: mongoose.model('Data', DataSchema)
};