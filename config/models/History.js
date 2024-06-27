const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
    video_id: {
        type: String
    },
    user: {
        type: String
    },
    date_watched: {
        type: Date,
        default: Date.now()
    }
});

const History = mongoose.model('History', HistorySchema);

module.exports = History;