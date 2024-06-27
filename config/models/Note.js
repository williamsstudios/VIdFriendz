const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
    user1: {
        type: String
    },
    user2: {
        type: [String]
    },
    app: {
        type: String
    },
    note: {
        type: String
    },
    did_read: {
        type: Boolean,
        default: false
    },
    date_made: {
        type: Date,
        default: Date.now()
    }
});

const Note = mongoose.model('Note', NoteSchema);

module.exports = Note;