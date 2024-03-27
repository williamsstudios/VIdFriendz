const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
    title: {
        type: String
    },
    author: {
        type: String
    },
    filename: {
        type: String
    },
    description: {
        type: String
    },
    category: {
        type: String
    },
    upload_date: {
        type: Date,
        default: Date.now()
    },
    likes: {
        type: [String]
    },
    views: {
        type: [String]
    }
});

const Video = mongoose.model('Video', VideoSchema);

module.exports = Video;