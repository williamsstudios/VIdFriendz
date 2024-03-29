const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { forwardAuthenticated, ensureAuthenticated } = require('../config/auth');

// Load Models
const User = require('../models/User');
const Video = require('../models/Video');
const History = require('../models/History');
const Comment = require('../models/Comment');
const Note = require('../models/Note');

// Time Ago Function
function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    const interval = Math.floor(seconds / 31536000);

    if (interval > 1) {
        return interval + " years ago";
    }
    if (interval === 1) {
        return interval + " year ago";
    }

    const months = Math.floor(seconds / 2628000);
    if (months > 1) {
        return months + " months ago";
    }
    if (months === 1) {
        return months + " month ago";
    }

    const days = Math.floor(seconds / 86400);
    if (days > 1) {
        return days + " days ago";
    }
    if (days === 1) {
        return days + " day ago";
    }

    const hours = Math.floor(seconds / 3600);
    if (hours > 1) {
        return hours + " hours ago";
    }
    if (hours === 1) {
        return hours + " hour ago";
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes > 1) {
        return minutes + " minutes ago";
    }
    if (minutes === 1) {
        return minutes + " minute ago";
    }

    return "just now";
}

// Multer Config
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/uploads/' + req.user.username)
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1181116006 }
});

// Upload Video Page
router.get('/upload', ensureAuthenticated, (req, res) => {
    Note.findOne({ $and: [{ user2: req.user.username }, { did_read: false }] }, (err, newNotes) => {
        if(err) {
            console.log(err);
        } else {
            res.render('upload', {
                title: 'Upload A Video',
                logUser: req.user,
                newNotes: newNotes
            })
        }
    });
});

// Video Upload Function
router.post('/upload', upload.single('file'), (req, res) => {
    let newVideo = new Video({
        filename: req.file.filename,
        author: req.user.username
    });

    newVideo
        .save()
        .then(video => {
            res.json({ filename : req.file.filename });
        })
        .catch(err => console.log(err));
});

// Upload Video Thumbnail
router.post('/thumbnail/:id', upload.single('thumbnail'), (req, res) => {
    const file = req.file;
    
    if(!file) {
        req.flash(
            'error_msg',
            'Please select a thumbnail'
        )
    } else {
        let updateThumb = {
            thumbnail: req.file.filename
        };

        let query = { filename: req.params.id };

        Video.findOneAndUpdate(query, updateThumb, (err) => {
            if(err) {
                console.log(err);
            } else {
                req.flash(
                    'success_msg',
                    'Video Updated'
                )
                res.redirect(req.get('referer'));
            }
        });
    }
});

// Edit Video Function
router.post('/edit/:file', (req, res) => {
    const title = req.body.title;
    const description = req.body.description;
    const category = req.body.category;

    let updateVideo = {
        title: title,
        description: description,
        category: category
    }

    let query = { filename: req.params.file };

    Video.findOneAndUpdate(query, updateVideo, (err) => {
        if(err) {
            console.log(err);
        } else {
            User.find({ username: req.user.username }, (err, subscribers) => {
                if(err) {
                    console.log(err);
                } else {
                    subscribers.forEach(subscriber => {
                        let newNote = new Note({
                            user1: req.user.username,
                            user2: subscriber.username,
                            app: "New Video Upload",
                            note: "added a new video"
                        });

                        newNote
                            .save()
                            .then(subscribers => {
                                req.flash(
                                    'success_msg',
                                    'Video Updated'
                                )
                                res.redirect('/');
                            })
                            .catch(err => console.log(err));
                    })
                }
            });
        }
    });
});

// Like Video
router.post('/like/:id', (req, res) => {
    Video.findOneAndUpdate({ _id: req.params.id }, { $push: { likes: req.user.username } }).exec();
    res.redirect(req.get('referer'));
});

// Unlike Video
router.post('/unlike/:id', (req, res) => {
    Video.findOneAndUpdate({ _id: req.params.id }, { $pull: { likes: req.user.username } }).exec();
    res.redirect(req.get('referer'));
});

// Watch Page
router.get('/watch/:id', ensureAuthenticated, (req, res) => {
    Video.findOne({ _id: req.params.id }, (err, video) => {
        if(err) {
            console.log(err);
        } else {
            User.findOne({ username: video.author }, (err, vidUser) => {
                if(err) {
                    console.log(err);
                } else {
                    Comment.aggregate([
                        { $match: { video_id: req.params.id } },
                        {
                            $lookup: {
                                from: "users",
                                localField: "user1",
                                foreignField: "username",
                                as: "comments"
                            }
                        },
                        {
                            $unwind: "$comments"
                        }
                    ]).then(comments => {
                        Note.findOne({ $and: [{ user2: req.user.username }, { did_read: false }] }, (err, newNotes) => {
                            if(err) {
                                console.log(err);
                            } else {
                                History.findOne({ $and: [{ video_id: req.params.id }, { user: req.user.username }] }, (err, history) => {
                                    if(err) {
                                        console.log(err);
                                    } else if(history) {
                                        res.render('watch', {
                                            title: video.title,
                                            logUser: req.user,
                                            video: video,
                                            vidUser: vidUser,
                                            timeAgo: timeAgo(video.upload_date),
                                            playlists: playlists,
                                            comments: comments,
                                            c_timeAgo: timeAgo(comments.date_made),
                                            newNotes: newNotes
                                        });
                                    } else {
                                        Video.findOneAndUpdate({ _id: req.params.id }, { $push: { views: req.user.username } }).exec();
                                        let newHistory = new History({
                                            video_id: req.params.id,
                                            user: req.user.username
                                        });
                                                
                                        newHistory
                                            .save()
                                            .then(history => {
                                                res.render('watch', {
                                                    title: video.title,
                                                    logUser: req.user,
                                                    video: video,
                                                    vidUser: vidUser,
                                                    timeAgo: timeAgo(video.upload_date),
                                                    playlists: playlists,
                                                    comments: comments,
                                                    c_timeAgo: timeAgo(comments.date_made),
                                                    newNotes: newNotes
                                                });
                                            })
                                            .catch(err => console.log(err));
                                    }
                                });
                            }
                        });
                    }).catch(err => console.log(err));
                }
            })
        }
    });
});

// Comment On Video Function
router.post('/comment/:id', (req, res) => {
    Video.findOne({ _id: req.params.id }, (err, video) => {
        if(err) {
            console.log(err);
        } else {
            const commentText = req.body.commentText;
            const user1 = req.user.username;
            const user2 = video.author;

            if(!commentText) {
                req.flash(
                    'error_msg',
                    'Please type something first'
                );
                res.redirect(req.get('referer'));
            } else {
                let newComment = new Comment({
                    user1: user1,
                    user2: user2,
                    video_id: video._id,
                    data: commentText
                });

                newComment
                    .save()
                    .then(comment => {
                        User.find({ username: req.user.username }, (err, subscribers) => {
                            if(err) {
                                console.log(err);
                            } else {
                                subscribers.forEach(subscriber => {
                                    let newNote = new Note({
                                        user1: req.user.username,
                                        user2: subscriber.username,
                                        app: "New Video Upload",
                                        note: "added a new video"
                                    });
            
                                    newNote
                                        .save()
                                        .then(subscribers => {
                                            res.redirect(req.get('referer'));
                                        })
                                        .catch(err => console.log(err));
                                });
                            }
                        });
                    })
                    .catch(err => console.log(err));
            }
        };
    });

});

// Like Comment Function
router.post('/comment/like/:id', (req, res) => {
    Comment.findOneAndUpdate({ _id: req.params.id }, { $push: { likes: req.user.username } }).exec();
    res.redirect(req.get('referer'));
});

// Unlike Comment Function
router.post('/comment/unlike/:id', (req, res) => {
    Comment.findOneAndUpdate({ _id: req.params.id }, { $pull: { likes: req.user.username } }).exec();
    res.redirect(req.get('referer'));
});

module.exports = router;