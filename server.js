const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const path = require('path');

// Init App
const app = express();

// Load Modals
const User = require('./models/User');
const Video = require('./models/Video');

// Passport Config
require('./config/passport')(passport);

// Db Config
const db = require('./config/keys').mongoURI;

// Connect To MongoDB
mongoose
    .connect(
        db,
        { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false }
    )
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// Express Body Parser
app.use(express.urlencoded({ extended: true }));

// Express Session
app.use(
    session({
        name: 'login',
        secret: 'secret',
        resave: true,
        saveUninitialized: true
    })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect Flash
app.use(flash());

// Global Variables
app.use(function(req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// Home Page
app.get('/', (req, res) => {
    Video.aggregate([
        { $match: { featured: true } },
        {
            $lookup: {
                from: "users",
                localField: "author",
                foreignField: "username",
                as: "featVid"
            }
        },
        {
            $unwind: "$featVid"
        }
    ]).then(featVid => {
        Video.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "username",
                    as: "videos"
                }
            },
            {
                $unwind: "$videos"
            }
        ]).then(videos => {
            User.find({}, (err, channels) => {
                if(err) {
                    console.log(err);
                } else {
                    if(req.user) {
                        res.render('index', {
                            title: 'VidFriendz',
                            featVid: featVid,
                            logUser: req.user,
                            videos: videos,
                            channels: channels
                        });
                    } else {
                        res.render('index', {
                            title: 'VidFriendz',
                            featVid: featVid,
                            logUser: "",
                            videos: videos,
                            channels: channels
                        });
                    }
                }
            }).limit(4);
        }).catch(err => console.log(err));
    }).catch(err => console.log(err));
});

// Routes
app.use('/users', require('./routes/users'));
app.use('/videos', require('./routes/videos'));
app.use('/posts', require('./routes/posts'));
app.use('/chat', require('./routes/chat'));

// Start Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server Listening");
});