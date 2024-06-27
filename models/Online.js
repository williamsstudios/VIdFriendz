const mongoose = require('mongoose');

const OnlineSchema = new mongoose.Schema({
    user: {
        type: String
    },
    message: {
        type: String
    },
    date_made: {
        type: Date,
        default: Date.now()
    }
});

const Online = mongoose.model('Online', OnlineSchema);

module.exports = Online;