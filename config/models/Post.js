const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    user1: {
        type: String
    },
    user2: {
        type: String
    },
    privacy: {
        type: String
    },
    data: {
        type: String
    },
    tags: {
        type: [String]
    },
    post_date: {
        type: Date,
        defautl: Date.now()
    },
    likes: {
        type: [String]
    },
    images: {
        type: [String]
    },
    videos: {
        type: [String]
    }
});

const Post = mongoose.model('Post', PostSchema);

module.exports = Post;