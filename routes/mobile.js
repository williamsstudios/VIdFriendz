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
const Comment = require('../models/Comment');

// Multer Config
var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, '../public/uploads/' + req.user.username)
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
        } else if(newNotes) {
            res.render('../mobile/upload', {
                title: 'Upload A Video',
                logUser: req.user,
                newNotes: 1
            })
        } else {
            res.render('../mobile/upload', {
                title: 'Upload A Video',
                logUser: req.user,
                newNotes: 0
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
                res.redirect('/mobile/');
            }
        });
    }
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

// Home Page
router.get('/', (req, res) => {
    if(req.user) {
        Note.findOne({ $and: [{ user2: req.user.username }, { did_read: false }] }, (err, newNotes) => {
            if(err) {
                console.log(err);
            } else if(newNotes) {
                Video.find({ $or: [ {author: req.user.username }, {author: req.user.subscriptions} ] }, (err, videos) => {
                    if(err) {
                        console.log(err);
                    } else {
                        res.render('../mobile/index', {
                            title: 'VidFriendz',
                            logUser: req.user,
                            videos: videos,
                            newNotes: 1
                        });
                    }
                });
            } else {
                Video.find({ $or: [ {author: req.user.username }, {author: req.user.subscriptions} ] }, (err, videos) => {
                    if(err) {
                        console.log(err);
                    } else {
                        res.render('../mobile/index', {
                            title: 'VidFriendz',
                            logUser: req.user,
                            videos: videos,
                            newNotes: 0
                        });
                    }
                });
            }
        });
    } else {
        Video.find({}, (err, videos) => {
            res.render('../mobile/index', {
                title: 'VidFriendz',
                logUser: "",
                videos: videos,
                newNotes: ""
            });
        });
    }
});

// Sign Up Page
router.get('/signup', forwardAuthenticated, (req, res) => {
    res.render('../mobile/signup', {
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
        res.render('../mobile/index', {
            title: 'VidParties',
            errors: errors
        });
    } else {
        User.findOne({ email: email }).then(user => {
            if (user) {
                errors.push({ msg: 'Email Already Exists' });
                res.render('../mobile/index', {
                    title: 'Sign Up',
                    errors: errors
                });
            } else {
                User.findOne({ username: username }).then(user => {
                    if (user) {
                        errors.push({ msg: 'Username Already Exists' });
                        res.render('../mobile/signup', {
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
                                        const dir = '../public/uploads/' + newUser.username;
                                        fs.mkdir(dir, (err) => {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                req.flash(
                                                    'success_msg',
                                                    'You are now registered and can log in'
                                                );
                                                res.redirect('../mobile/');
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

// Login Page
router.get('/login', forwardAuthenticated, (req, res) => {
    res.render('../mobile/login', {
        title: 'Log In',
        logUser: ""
    });
});

// Log In Function
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '../mobile/',
        failureRedirect: '../mobile/',
        failureFlash: true
    })(req, res, next);
});

// User Settings Page
router.get('/settings', ensureAuthenticated, (req, res) => {
    res.render('../mobile/settings', {
        title: 'Settings',
        logUser: req.user
    });
});

// Logout Function
router.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'You are logged out');
    res.redirect('/users/login');
});

// Edit Profile Page
router.get('/edit_profile', ensureAuthenticated, (req, res) => {
    res.render('../mobile/edit_profile', {
        title: 'Edit Profile',
        logUser: req.user
    });
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
                } else if(videos) {
                    Note.findOne({ $and: [{ user2: req.user.username }, { did_read: false }] }, (err, newNotes) => {
                        if(err) {
                            console.log(err);
                        } else if(newNotes) {
                            res.render('../mobile/profile', {
                                title: user.firstname + ' ' + user.lastname,
                                logUser: req.user,
                                user: user,
                                videos: videos,
                                newNotes: 1,
                            });     
                        } else {
                            res.render('../mobile/profile', {
                                title: user.firstname + ' ' + user.lastname,
                                logUser: req.user,
                                user: user,
                                videos: videos,
                                newNotes: 0,
                            });   
                        }
                    });
                } else {
                    Note.findOne({ $and: [{ user2: req.user.username }, { did_read: false }] }, (err, newNotes) => {
                        if(err) {
                            console.log(err);
                        } else if(newNotes) {
                            res.render('../mobile/profile', {
                                title: user.firstname + ' ' + user.lastname,
                                logUser: req.user,
                                user: user,
                                videos: "",
                                newNotes: 1,
                            });     
                        } else {
                            res.render('../mobile/profile', {
                                title: user.firstname + ' ' + user.lastname,
                                logUser: req.user,
                                user: user,
                                videos: "",
                                newNotes: 0,
                            });   
                        }
                    });
                }
            });
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
                'You subscribed to this channel'
            );
            res.redirect(req.get('referer'));
        })
        .catch(err => console.log(err));
});

// Unsubscribe Function
router.post('/subscribe/:id', (req, res) => {
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
                            } else if(newNotes) {
                                History.findOne({ $and: [{ video_id: req.params.id }, { user: req.user.username }] }, (err, history) => {
                                    if(err) {
                                        console.log(err);
                                    } else if(history) {
                                        res.render('../mobile/watch', {
                                            title: video.title,
                                            logUser: req.user,
                                            video: video,
                                            vidUser: vidUser,
                                            timeAgo: timeAgo(video.upload_date),
                                            comments: comments,
                                            c_timeAgo: timeAgo(comments.date_made),
                                            newNotes: 1
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
                                                res.render('../mobile/watch', {
                                                    title: video.title,
                                                    logUser: req.user,
                                                    video: video,
                                                    vidUser: vidUser,
                                                    timeAgo: timeAgo(video.upload_date),
                                                    comments: comments,
                                                    c_timeAgo: timeAgo(comments.date_made),
                                                    newNotes: 1
                                                });
                                            })
                                            .catch(err => console.log(err));
                                    }
                                });
                            } else {
                                History.findOne({ $and: [{ video_id: req.params.id }, { user: req.user.username }] }, (err, history) => {
                                    if(err) {
                                        console.log(err);
                                    } else if(history) {
                                        res.render('../mobile/watch', {
                                            title: video.title,
                                            logUser: req.user,
                                            video: video,
                                            vidUser: vidUser,
                                            timeAgo: timeAgo(video.upload_date),
                                            comments: comments,
                                            c_timeAgo: timeAgo(comments.date_made),
                                            newNotes: 0
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
                                                res.render('../mobile/watch', {
                                                    title: video.title,
                                                    logUser: req.user,
                                                    video: video,
                                                    vidUser: vidUser,
                                                    timeAgo: timeAgo(video.upload_date),
                                                    comments: comments,
                                                    c_timeAgo: timeAgo(comments.date_made),
                                                    newNotes: 0
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

// Delete Video
router.post('/deleteVid/:id', (req, res) => {
    Video.findOne({ _id: req.params.id }, (err, video) => {
        if(err) {
            console.log(err);
        } else {
            let directoryPath = "./public/uploads/" + req.user.username + "/" + video.filename;
            fs.unlink(directoryPath, (err) => {
                if (err) {
                    console.log(err);
                } else {
                    Video.findOneAndDelete({ _id: req.params.id }, (err) => {
                        if(err) {
                            console.log(err);
                        } else {
                            History.deleteMany({ video_id: video._id }, (err) => {
                                if(err) {
                                    console.log(err);
                                } else {
                                    Comment.deleteMany({ video_id: video._id }, (err) => {
                                        if(err) {
                                            console.log(err);
                                        } else {
                                            req.flash(
                                                'success_msg',
                                                'Video Deleted'
                                            );
                                            res.redirect('/mobile/'); 
                                        }
                                    })
                                }
                            });    
                        }
                    });
                }
            });
        }
    });
});


module.exports = router;