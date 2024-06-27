const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const fs = require('fs');
const path = require('path');
const { forwardAuthenticated, ensureAuthenticated } = require('../config/auth');
const multer = require('multer');

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

// Calculate Age Function
function getAge(dateString) {
    var today = new Date();
    var birthDate = new Date(dateString);
    var age = today.getFullYear() - birthDate.getFullYear();
    var m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// Load Models
const User = require('../models/User');
const Video = require('../models/Video');
const Note = require('../models/Note');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// Sign Up Page
router.get('/signup', forwardAuthenticated, (req, res) => {
    res.render('signup', {
        title: 'Sign Up',
        logUser: ""
    });
});

// Sign Up Function
router.post('/signup', (req, res) => {
    const { firstname, lastname, username, reg_email, pass, pass2, gender, country, birthday } = req.body;
    let errors = [];

    if (!firstname || !lastname || !username || !reg_email || !pass || !pass2 || !gender || !country || !birthday) {
        errors.push({ msg: 'All Fileds Required' });
    }
    if (pass != pass2) {
        errors.push({ msg: 'Your Password Fields Do Not Match' });
    }
    if (pass.length < 7) {
        errors.push({ msg: 'Passwords Should Be 7 Characters Or More' });
    }
    if (username.length < 3 || username.length > 32) {
        errors.push({ msg: 'Usernames Should Be 3-32 Characters' });
    }
    if (errors.length > 0) {
        res.render('index', {
            title: 'VidFriendz',
            errors: errors
        });
    } else {
        User.findOne({ email: reg_email }).then(user => {
            if (user) {
                errors.push({ msg: 'Email Already Exists' });
                res.render('index', {
                    title: 'VidFriendz',
                    errors: errors
                });
            } else {
                User.findOne({ username: username }).then(userCheck => {
                    if (userCheck) {
                        errors.push({ msg: 'Username Already Exists' });
                        res.render('index', {
                            title: "VidFriendz",
                            errors: errors
                        });
                    } else {
                        let newUser = new User({
                            firstname: firstname,
                            lastname: lastname,
                            username: username,
                            email: reg_email,
                            password: pass,
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
    res.redirect('/');
});

// Dashboard Page
router.get('/dashboard', ensureAuthenticated, (req, res) => {
    Note.aggregate([
        { $match: { receiver: req.user.username } },
        {
            $lookup: {
                from: "users",
                localField: "initator",
                foreignField: "username",
                as: "notes"
            }
        },
        {
            $unwind: "$notes"
        }
    ]).then(notes => {
        Video.find({ author: req.user.username }, (err, videos) => {
            if(err) {
                console.log(err);
            } else {
                res.render('dashboard', {
                    title: 'Dashboard',
                    logUser: req.user,
                    notes: notes,
                    videos: videos
                });
            }
        });
    }).catch(err => console.log(err));
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
                    User.aggregate([
                        {$match: { username: req.params.id }},
                        {
                            $lookup: {
                                from: "users",
                                localField: "subscribers",
                                foreignField: "username",
                                as: "subs"
                            }
                        },
                        {
                            $unwind: "$subs"
                        }
                    ]).then(subs => {
                        Post.aggregate([
                            { $match: { $or: [{ author: req.params.id }, { receiver: req.params.id }] } },
                            {
                                $lookup: {
                                    from: "users",
                                    localField: "author",
                                    foreignField: "username",
                                    as: "posts"
                                }
                            },
                            {
                                $unwind: "$posts"
                            }
                        ]).then(posts => {
                            Comment.aggregate([
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
                                const age = getAge(user.birthday);
                                res.render('profile', {
                                    title: user.firstname + ' ' + user.lastname,
                                    logUser: req.user,
                                    user: user,
                                    videos: videos,
                                    age: age,
                                    subs: subs,
                                    posts: posts,
                                    comments: comments     
                                });
                            }).catch(err => console.log(err)); 
                        }).catch(err => console.log(err));
                    })
                }
            });
        }
    });
});

// Subscribe Function
router.post('/subscribe/:id', (req, res) => {
    User.findOne({ _id: req.params.id }, (err, user) => {
        if(err) {
            console.log(err);
        } else {
            User.findOneAndUpdate({ username: req.user.username }, { $push: { subscriptions: user.username } }).exec();
            User.findOneAndUpdate({ username: user.username }, { $push: { subscribers: req.user.username } }).exec();
            res.redirect(req.get('referer'));
        }
    })
});

// Unsubscribe Function
router.post('/unsubscribe/:id', (req, res) => {
    User.findOne({ _id: req.params.id }, (err, user) => {
        if(err) {
            console.log(err);
        } else {
            User.findOneAndUpdate({ username: req.user.username }, { $pull: { subscriptions: user.username } }).exec();
            User.findOneAndUpdate({ username: user.username }, { $pull: { subscribers: req.user.username } }).exec();
            res.redirect(req.get('referer'));
        }
    })
});

// Edit Name Function
router.post('/edit/name', (req, res) => {
    const firstname = req.body.firstname;
    const lastname = req.body.lastname;

    if(!firstname || !lastname) {
        req.flash(
            'error_msg',
            'Both Fields Required'
        );
        res.redirect(req.get('referer'));
    } else {
        let updateName = {
            firstname: firstname,
            lastname: lastname
        };

        let query = { username: req.user.username };

        User.findOneAndUpdate(query, updateName, (err) => {
            if(err) {
                console.log(err);
            } else {
                req.flash(
                    'success_msg',
                    'Name Updated'
                );
                res.redirect(req.get('referer'));
            }
        });
    }
});

// Edit Email Function
router.post('/edit/email', (req, res) => {
    const email = req.body.email;

    User.findOne({ email: email }, (err, emailExist) => {
        if(err) {
            console.log(err);
        } else if(emailExist) {
            req.flash(
                'error_msg',
                'That Email Is Already Connected To Another Account'
            );
            res.redirect(req.get('referer'));
        } else {
            let updateEmail = {
                email: email
            };

            let query = { username: req.user.username };

            User.findOneAndUpdate(query, updateEmail, (err) => {
                if(err) {
                    console.log(err);
                } else {
                    req.flash(
                        'success_msg',
                        'Email Updated'
                    );
                    res.redirect(req.get('referer'));
                }
            });
        }
    });
});

// Edit Password Function
router.post('/edit/password', (req, res) => {
    const pass = req.body.pass;
    const pass2 = req.body.pass2;

    if(!pass || !pass2) {
        req.flash(
            'error_msg',
            'Both Fields Required'
        );
        res.redirect(req.get('referer'));
    } else if(pass.length < 7) {
        req.flash(
            'error_msg',
            'Passwords Should Be 7 Characters Or More'
        );
        res.redirect(req.get('referer'));
    } else {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(pass, salt, (err, hash) => {
                if (err) throw err;
                pass = hash;
                let updatePass = {
                    password: hash
                };

                let query = { username: req.user.username };

                User.findOneAndUpdate(query, updatePass, (err) => {
                    if(err) {
                        console.log(err);
                    } else {
                        req.flash(
                            'success_msg',
                            'Password Updated'
                        );
                        res.redirect(req.get('referer'));
                    }
                });
            });
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
            'Country Can Not Be Empty'
        );
        res.redirect(req.get('referer'));
    } else {
        let updateLoc = {
            city: city,
            state: state,
            country: country
        };

        let query = { username: req.user.username };

        User.findOneAndUpdate(query, updateLoc, (err) => {
            if(err) {
                console.log(err);
            } else {
                req.flash(
                    'success_msg',
                    'Location Updated'
                );
                res.redirect(req.get('referer'));
            }
        })
    }
});

// Edit Bio Function
router.post('/edit/bio', (req, res) => {
    const bio = req.body.bio;

    if(!bio) {
        req.flash(
            'error_msg',
            'Please type something first'
        );
        res.redirect(req.get('referer'));
    } else {
        let updateBio = {
            bio: bio
        };

        let query = { username: req.user.username }

        User.findOneAndUpdate(query, updateBio, (err) => {
            if(err) {
                console.log(err);
            } else {
                req.flash(
                    'success_msg',
                    'Bio updated successfully'
                );
                res.redirect(req.get('referer'));
            }
        });
    }
});

// Edit Cover Picutre Function
router.post('/edit/coverPic', upload.single('cover'), (req, res) => {
    const file = req.file;

    if(!file) {
        req.flash(
            'error_msg',
            'Please Select An Image First'
        );
        res.redirect(req.get('referer'));
    } else {
        let updateCover = {
            coverPic: req.file.filename
        };

        let query = { username: req.user.username }

        User.findOneAndUpdate(query, updateCover, (err) => {
            if(err) {
                console.log(err);
            } else {
                req.flash(
                    'success_msg',
                    'Cover photo update success'
                );
                res.redirect(req.get('referer'));
            }
        });
    }
});

// Edit Profile Picture Function
router.post('/edit/avatar', upload.single('avatar'), (req, res) => {
    const file = req.file;

    if(!file) {
        req.flash(
            'error_msg',
            'Please Select An Image First'
        );
    } else {
        let updateAvatar = {
            avatar: req.file.filename
        };

        let query = { username: req.user.username }

        User.findOneAndUpdate(query, updateAvatar, (err) => {
            if(err) {
                console.log(err);
            } else {
                
                req.flash(
                    'success_msg',
                    'Profile picutre update success'
                )
                res.redirect(req.get('referer'));
            }
        });
    }
});


module.exports = router;