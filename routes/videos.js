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
const Playlist = require('../models/Playlist');
const Comment = require('../models/Comment');

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
    res.render('upload', {
        title: 'Upload A Video',
        logUser: req.user
    })
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
            req.flash(
                'success_msg',
                'Video Updated'
            )
            res.redirect('/');
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
                    Playlist.find({ user: req.user.username }, (err, playlists) => {
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
                                            c_timeAgo: timeAgo(comments.date_made)
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
                                                    c_timeAgo: timeAgo(comments.date_made)
                                                });
                                            })
                                            .catch(err => console.log(err));
                                    }
                                });
                            }).catch(err => console.log(err));
                        }
                    })
                }
            });
        }
    });
});

// Add To Playlist Function
router.post('/addToPlaylist/:video/:playlist', (req, res) => {
    Playlist.findOne({ $and: [{ title: req.params.playlist }, { user: req.user.username }] }, (err, playlist) => {
        if(err) {
            console.log(err);
        } else if(playlist.videos == req.params.video) {
            req.flash(
                'error_msg',
                'This video is already on this playlist'
            );
            res.redirect(req.get('referer'));
        } else {
            Playlist.findOneAndUpdate({ $and: [{ title: req.params.playlist }, { user: req.user.username }] }, { $push: { videos: req.params.video } }).exec();
            req.flash(
                'success_msg',
                'Video added to the playlist'
            );
            res.redirect(req.get('referer'));
        }
    });
});

// Create A New Playlist
router.post('/newPlaylist/:video', (req, res) => {
    const title = req.body.title;
    const user = req.user.username;
    const privacy = req.body.privacy;

    if(!title) {
        req.flash(
            'error_msg',
            'Please enter a title'
        );
        res.redirect(req.get('referer'));
    } else {
        let newPlaylist = new Playlist({
            title: title,
            user: user,
            privacy: privacy
        });

        newPlaylist
            .save()
            .then(playlist => {
                Video.findOneAndUpdate({ title: title }, { $push: { videos: req.params.video } }).exec();
                req.flash(
                    'success_msg',
                    'Playlist created and video added'
                );
                res.redirect(req.get('referer'));
            })
            .catch(err => console.log(err));
    }
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
                        res.redirect(req.get('referer'));
                    })
                    .catch(err => console.log(err));
            }
        };
    });

});

module.exports = router;