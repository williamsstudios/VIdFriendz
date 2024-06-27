const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
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

const Chat = mongoose.model('Chat', ChatSchema);

module.exports = Chat;