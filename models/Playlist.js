const mongoose = require('mongoose');

const PlaylistSchema = new mongoose.Schema({
    title: {
        type: String
    },
    user: {
        type: String
    },
    videos: {
        type: [String]
    },
    date_made: {
        type: Date,
        default: Date.now()
    },
    privacy: {
        type : String
    }
});

const Playlist = mongoose.model('Playlist', PlaylistSchema);

module.exports = Playlist;