const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const fs = require('fs');
const path = require('path');

// Load Models
const User = require('../models/User');
const Video = require('../models/Video');
const Note = require('../models/Note');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// New Post Function
router.post('/new/:id', (req, res) => {
    const author = req.user.username;
    const receiver = req.params.id;
    const data = req.body.postText;

    if(!data) {
        req.flash(
            'error_msg',
            'Please type something first'
        );
        res.redirect(req.get('referer'));
    } else if(req.user.subscribers.length > 0 && receiver == req.user.username) {
        req.user.subscribers.forEach(sub => {
            let newNote = new Note({
                initator: req.user.username,
                receiver: sub,
                app: 'New Post',
                note: 'made a new post'
            });

            newNote.save();
        });
        let newPost = new Post({
            author: author,
            receiver: receiver,
            data: data
        });

        newPost
            .save()
            .then(post => {
                res.redirect(req.get('referer'));
            })
            .catch(err => console.log(err));
    } else if(receiver == req.user.subscribers) {
        req.user.subscribers.forEach(sub => {
            let newNote = new Note({
                initator: req.user.username,
                receiver: receiver,
                app: 'New Post',
                note: 'wrote a post on your profile'
            });

            newNote.save();
        });
        let newPost = new Post({
            author: author,
            receiver: receiver,
            data: data
        });

        newPost
            .save()
            .then(post => {
                res.redirect(req.get('referer'));
            })
            .catch(err => console.log(err));
    }
});

// Like Post Function
router.post('/like/:id', (req, res) => {
    Post.findOne({ _id: req.params.id }, (err, post) => {
        if(err) {
            console.log(err);
        } else {
            let newNote = new Note({
                initator: req.user.username,
                receiver: post.author,
                app: 'Post Like',
                note: 'liked your post'
            });

            newNote
                .save()
                .then(post => {
                    Post.findOneAndUpdate({ _id: req.params.id }, { $push: { likes: req.user.username } }).exec();
                    req.flash(
                        'success_msg',
                        'You Liked A Post'
                    );
                    res.redirect(req.get('referer'));
                })
                .catch(err => console.log(err));
        }
    })
});

// Unlike post Function
router.post('/unlike/:id', (req, res) => {
    Post.findOneAndUpdate({ _id: req.params.id }, { $pull: { likes: req.user.username } }).exec();
    res.redirect(req.get('referer'));
});

// Comment Post Function
router.post('/comment/:id', (req, res) => {
    Post.findOne({ _id: req.params.id }, (err, post) => {
        if(err) {
            console.log(err);
        } else {
            const commentText = req.body.commentText;
            let newComment = new Comment({
                author: req.user.username,
                post_id: post._id,
                data: commentText
            });

            newComment
                .save()
                .then(comment => {
                    let newNote = new Note({
                        initator: req.user.username,
                        receiver: post.author,
                        app: 'Post Comment',
                        note: 'commented on your post'
                    });

                    newNote
                        .save()
                        .then(note => {
                            req.flash(
                                'success_msg',
                                'Comment Sent'
                            );
                            res.redirect(req.get('referer'));
                        })
                        .catch(err => console.log(err));
                })
                .catch(err => console.log(err));
        }
    });
});

// Delete Post Function
router.post('/delete/:id', (req, res) => {
    Post.findOneAndDelete({ _id: req.params.id }, (err) => {
        if(err) {
            console.log(err);
        } else {
            req.flash(
                'success_msg',
                'Post Deleted'
            );
            res.redirect(req.get('referer'));
        }
    });
});

module.exports = router;