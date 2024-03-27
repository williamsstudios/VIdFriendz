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

// Sign Up
router.get('/signup', forwardAuthenticated, (req, res) => {
    res.render('signup', {
        title: 'Sign Up',
        logUser: ""
    });
});

// Sign Up Function
router.post('/signup', (req, res) => {
    const { firstname, lastname, username, email, password, password2, gender, country, birthday } = req.body;
    let errors = [];

    if (!firstname || !lastname || !username || !email || !password || !password2 || !gender || !country || !birthday) {
        errors.push({ msg: 'All Fileds Required' });
    }
    if (password != password2) {
        errors.push({ msg: 'Your Password Fields Do Not Match' });
    }
    if (password.length < 7) {
        errors.push({ msg: 'Passwords Should Be 7 Characters Or More' });
    }
    if (username.length < 3 || username.length > 32) {
        errors.push({ msg: 'Usernames Should Be 3-32 Characters' });
    }
    if (errors.length > 0) {
        res.render('index', {
            title: 'VidParties',
            errors: errors
        });
    } else {
        User.findOne({ email: email }).then(user => {
            if (user) {
                errors.push({ msg: 'Email Already Exists' });
                res.render('index', {
                    title: 'Sign Up',
                    errors: errors
                });
            } else {
                User.findOne({ username: username }).then(user => {
                    if (user) {
                        errors.push({ msg: 'Username Already Exists' });
                        res.render('signup', {
                            title: 'Sign Up',
                            errors: errors
                        });
                    } else {
                        let newUser = new User({
                            firstname: firstname,
                            lastname: lastname,
                            username: username,
                            email: email,
                            password: password,
                            gender: gender,
                            country: country,
                            birthday: birthday
                        });

                        bcrypt.genSalt(10, (err, salt) => {
                            bcrypt.hash(newUser.password, salt, (err, hash) => {
                                if (err) throw err;
                                newUser.password = hash;
                                newUser
                                    .save()
                                    .then(user => {
                                        const dir = './public/uploads/' + newUser.username;
                                        fs.mkdir(dir, (err) => {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                let newPlaylist = new Playlist({
                                                    title: "Watch Later",
                                                    user: newUser.username,
                                                    privacy: "2"
                                                });

                                                newPlaylist
                                                    .save()
                                                    .then(playlist => {
                                                        req.flash(
                                                            'success_msg',
                                                            'You are now registered and can log in'
                                                        );
                                                        res.redirect('/');
                                                    })
                                                    .catch(err => console.log(err));
                                            }
                                        });
                                    })
                                    .catch(err => console.log(err));
                            });
                        });

                    }
                });
            }
        });
    }
});

// Log In Page
router.get('/login', forwardAuthenticated, (req, res) => {
    res.render('login', {
        title: 'Log In',
        logUser: ""
    });
});

// Log In Function
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/',
        failureFlash: true
    })(req, res, next);
});

// Search Page
router.get('/search', (req, res) => {
    if(req.user) {
        res.render('search', {
            title: 'Search',
            logUser: req.user
        })
    } else {
        res.render('search', {
            title: 'Search',
            logUser: ""
        });
    }
});

// Profile Page
router.get('/:id', ensureAuthenticated, (req, res) => {
    User.findOne({ username: req.params.id }, (err, user) => {
        if(err) {
            console.log(err);
        } else {
            Video.find({ author: user.username }, (err, videos) => {
                if(err) {
                    console.log(err);
                } else {
                    res.render('watch', {
                        title: video.title,
                        logUser: req.user,
                        user: user,
                        videos: videos
                    });
                }
            });
        }
    });
});

// Create A New Playlist
router.post('/newPlaylist', (req, res) => {
    let title = req.body.title;
    
    if(!title) {
        req.flash(
            'error_msg',
            'Please enter a title'
        );
        res.redirect(req.get('referer'));
    } else {
        let newPlaylist = new Playlist({
            title: title,
            user: req.user.username,
        });
    }
});

module.exports = router;