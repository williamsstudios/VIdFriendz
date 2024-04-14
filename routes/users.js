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
const Note = require('../models/Note');

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

// Sign Up Page
router.get('/signup', forwardAuthenticated, (req, res) => {
    res.render('signup', {
        title: 'Sign Up',
        logUser: "",
        newNotes: ""
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
                                                req.flash(
                                                    'success_msg',
                                                    'You are now registered and can log in'
                                                );
                                                res.redirect('/');
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
        logUser: "",
        newNotes: ""
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

// Logout Function
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'You are logged out');
    res.redirect('/users/login');
});

// Search Page
router.get('/search', (req, res) => {
    if(req.user) {
        res.render('search', {
            title: 'Search',
            logUser: req.user,
            newNotes: ""
        })
    } else {
        res.render('search', {
            title: 'Search',
            logUser: "",
            newNotes: ""
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
                    Note.findOne({ $and: [{ user2: req.user.username }, { did_read: false }] }, (err, newNotes) => {
                        if(err) {
                            console.log(err);
                        } else if(newNotes) {
                            res.render('profile', {
                                title: user.firstname + ' ' + user.lastname,
                                logUser: req.user,
                                user: user,
                                videos: videos,
                                newNotes: 1,
                            });     
                        } else {
                            res.render('profile', {
                                title: user.firstname + ' ' + user.lastname,
                                logUser: req.user,
                                user: user,
                                videos: videos,
                                newNotes: 0,
                            });   
                        }
                    });
                }
            });
        }
    });
});

// Notifications page
router.get('/notes', ensureAuthenticated, (req, res) => {
    Note.aggregate([
        { $match: { user2: req.user.username } },
        {
            $lookup: {
                from: "users",
                localField: "user1",
                foreignField: "username",
                as: "notes"
            }
        },
        {
            $unwind: "$notes"
        }
    ]).then(notes => {
        res.render('notes', {
            title: "Notifications",
            logUser: req.user,
            newNotes: "",
            notes: notes
        });
    }).catch(err => console.log(err));
});

// Mark Notification As Read
router.post('/notes/markAsRead/:id', (req, res) => {
    let updateNotes = {
        did_read: 1
    }

    let query = { _id: req.params.id };

    Note.findOneAndUpdate(query, updateNotes, (err) => {
        if(err) {
            console.log(err);
        } else {
            req.flash(
                'success_msg',
                'Note marked as read'
            );
            res.redirect(req.get('referer'));
        }
    });
});

// Mark Notification As Unread
router.post('/notes/markAsUnread/:id', (req, res) => {
    let updateNotes = {
        did_read: 0
    }

    let query = { _id: req.params.id };

    Note.findOneAndUpdate(query, updateNotes, (err) => {
        if(err) {
            console.log(err);
        } else {
            req.flash(
                'success_msg',
                'Note marked as unread'
            );
            res.redirect(req.get('referer'));
        }
    });
});

// Delete Note
router.post('/notes/delete/:id', (req, res) => {
    Note.findOneAndDelete({ _id: req.params.id }, (err) => {
        if(err) {
            console.log(err);
        } else {
            req.flash(
                'success_msg',
                'Note Deleted'
            );
            res.redirect(req.get('referer'));
        }
    });
});

// Subscribe Function
router.post('/subscribe/:id', (req, res) => {
    User.findOneAndUpdate({ username: req.user.username }, { $push: { subscriptions: req.params.id } }).exec();
    User.findOneAndUpdate({ username: req.params.id }, { $push: { subscribers: req.user.username } }).exec();
    let newNote = new Note({
        user1: req.user.username,
        user2: req.params.id,
        app: 'subs',
        note: 'subscribed to your channel'
    });

    newNote
        .save()
        .then(note => {
            req.flash(
                'success_msg',
                'Unsubscribed to this channel'
            );
            res.redirect(req.get('referer'));
        })
        .catch(err => console.log(err));
});

// Unsubscribe Function
router.post('/unsubscribe/:id', (req, res) => {
    User.findOneAndUpdate({ username: req.user.username }, { $pull: { subscriptions: req.params.id } }).exec();
    User.findOneAndUpdate({ username: req.params.id }, { $pull: { subscribers: req.user.username } }).exec();
    req.flash(
        'success_msg',
        'You unsubscribed from this channel'
    );
    res.redirect(req.get('referer'));
});

// Edit Avatar Function
router.post('/edit/avatar', upload.single('avatar'), (req, res) => {
    const file = req.file;

    if(!file) {
        req.flash(
            'error_msg',
            'Please select an image file'
        );
        res.redirect(req.get('referer'));
    } else {
        let updateAvatar = {
            avatar: file.filename
        };

        let query = { username: req.user.username }

        User.updateMany(query, updateAvatar, (err) => {
            if(err) {
                console.log(err);
            } else {
                req.flash(
                    'success_msg',
                    'Profile Picture Updated Successfully'
                );
                res.redirect(req.get('referer'));
            }
        });
    }
});

// Edit Cover Photo FUnction
router.post('/edit/cover', upload.single('cover'), (req, res) => {
    const file = req.file;

    if(!file) {
        req.flash(
            'error_msg',
            'Please select an image file'
        );
        res.redirect(req.get('referer'));
    } else {
        let updateCover = {
            coverPic: file.filename
        };

        let query = { username: req.user.username }

        User.updateMany(query, updateCover, (err) => {
            if(err) {
                console.log(err);
            } else {
                req.flash(
                    'success_msg',
                    'Cover Picture Updated Successfully'
                );
                res.redirect(req.get('referer'));
            }
        });
    }
});

// Edit Name Function
router.post('/edit/name', (req, res) => {
    const firstname = req.body.firstname;
    const lastname = req.body.lastname;

    if(!firstname || !lastname) {
        req.flash(
            'error_msg',
            'All Feilds Required'
        );
        res.redirect(req.get('referer'));
    } else {
        let updateName = {
            firstname: firstname,
            lastname: lastname
        };

        let query = { username: req.user.username };

        User.updateMany(query, updateName, (err) => {
            if(err) {
                console.log(err);
            } else {
                req.flash(
                    'success_msg',
                    'Name Updated Successfully'
                );
                res.redirect(req.get('referer'));
            }
        });
    }
});

// Edit Location Function
router.post('/edit/location', (req, res) => {
    const city = req.body.city;
    const state = req.body.state;
    const country = req.body.country;

    if(!country) { 
        req.flash(
            'error_msg',
            'Country field cannot be empty'
        );
        res.redirect(req.get('referer'));
    } else {
        let updateLocation = {
            city: city,
            state: state,
            country: country
        };

        let query = { username: req.user.username }

        User.updateMany(query, updateLocation, (err) => {
            if(err) {
                console.log(err);
            } else {
                req.flash(
                    'success_msg',
                    'Location updated successfuly'
                )
                res.redirect(req.get('referer'));
            }
        });
    }
});

// Edit About Me Function
router.post('/edit/bio', (req, res) => {
    const bio = req.body.bio;

    if(!bio) {
        req.flash(
            'error_msg',
            'please Type Somgehting First'
        );
        res.redirect(req.get('referer'));
    } else {
        let updateBio = {
            bio: bio
        }

        let query = { username: req.user.username };

        User.updateMany(query, updateBio, (err) => {
            if(err) {
                console.log(err);
            } else {
                req.flash(
                    'success_msg',
                    'About Me Updated Successfuly'
                );
                res.redirect(req.get('referer'));
            }
        });
    }
});

module.exports = router;