const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { forwardAuthenticated, ensureAuthenticated } = require('../config/auth');

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

// Load Models
const User = require('../models/User');
const Video = require('../models/Video');
const Comment = require('../models/Comment');
const Note = require('../models/Note');

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
                        { $match: { post_id: req.params.id } },
                        {
                            $lookup: {
                                from: "users",
                                localField: "author",
                                foreignField: "username",
                                as: "comments"
                            }
                        },
                        {
                            $unwind: "$comments"
                        }
                    ]).then(comments => {
                        Video.aggregate([
                            {
                                $lookup: {
                                    from: "users",
                                    localField: "author",
                                    foreignField: "username",
                                    as: "othervids"
                                }
                            },
                            {
                                $unwind: "$othervids"
                            }
                        ]).then(othervids => {
                            res.render('watch', {
                                title: video.title,
                                logUser: req.user,
                                vidUser: vidUser,
                                video: video,
                                comments: comments,
                                othervids: othervids
                            });
                        }).catch(err => console.log(err));
                    });
                }
            });
        }
    });
});

// Like Video Function
router.post('/like/:id', (req, res) => {
    Video.findOneAndUpdate({ _id: req.params.id }, { $push: { likes: req.user.username } }).exec();
    res.redirect(req.get('referer'));
});

// Unlike Video Function
router.post('/unlike/:id', (req, res) => {
    Video.findOneAndUpdate({ _id: req.params.id }, { $pull: { likes: req.user.username } }).exec();
    res.redirect(req.get('referer'));
});

// Comment Function
router.post('/comment/:id', (req, res) => {
    Video.findOne({ _id: req.params.id }, (err, video) => {
        if(err) {
            console.log(err);
        } else {
            const commentText = req.body.commentText;
            const author = req.user.username;
            const post_id = video._id;
                    
            if(!commentText) {
                req.flash(
                    'error_msg',
                    'Please type something first'
                );
                res.redirect(req.get('referer'));
            } else {
                let newComment = new Comment({
                    author: author,
                    post_id: post_id,
                    data: commentText
                });

                newComment
                    .save()
                    .then(comment => {
                        req.flash(
                            'success_msg',
                            'You Commented On This Video'
                        );
                        res.redirect(req.get('referer'));
                    }).catch(err => console.log(err));
            }
        }
    });
});

// Like Comment
router.post('/likeComment/:id', (req, res) => {
    Comment.findOneAndUpdate({ _id: req.params.id }, { $push: { likes: req.user.username } }).exec();
    res.redirect(req.get('referer'));
});

// Unlike Comment
router.post('/unlikeComment/:id', (req, res) => {
    Comment.findOneAndUpdate({ _id: req.params.id }, { $pull: { likes: req.user.username } }).exec();
    res.redirect(req.get('referer'));
});

// Delete Comment
router.post('/deleteComment/:id', (req, res) => {
    Comment.findOneAndDelete({ _id: req.params.id }, (err) => {
        if(err) {
            console.log(err);
        } else {
            res.redirect(req.get('referer'));
        }
    });
});

// Upload Video Page
router.get('/upload', ensureAuthenticated, (req, res) => {
    res.render('upload', {
        title: "Upload A Video",
        logUser: req.user
    });
});

// Upload Video Function
router.post('/upload', upload.single("video"), (req, res) => {
    const title = req.body.title;
    const author = req.user.username;
    const file = req.file;
    const description = req.body.description;
    const category = req.body.category;
    const privacy = req.body.privacy;

    if(!title || !file || !description || !category || !privacy) {
        req.flash(
            'error_msg',
            'All Fields Required'
        );
        res.redirect(req.get('referer'));
    } else {
        let newVideo = new Video({
            title: title,
            author: author,
            filename: file.filename,
            description: description,
            category: category,
            privacy: privacy
        });

        newVideo
            .save()
            .then(video => {
                req.user.subscribers.forEach(sub => {
                    let newNote = new Note({
                        initator: req.user.username,
                        receiver: sub,
                        app: 'New Video',
                        note: 'added a new video'
                    });
                    newNote.save();
                });
                req.flash(
                    'success_msg',
                    'Video Uploaded'
                );
                res.redirect(req.get('referer'));
            })
            .catch(err => console.log(err));
    }
});

module.exports = router;