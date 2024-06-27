const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    author: {
        type: String
    },
    receiver: {
        type: String
    },
    data: {
        type: String
    },
    likes: {
        type: [String]
    },
    date_made: {
        type: Date,
        default: Date.now()
    }
});

const Post = mongoose.model('Post', PostSchema);

module.exports = Post;