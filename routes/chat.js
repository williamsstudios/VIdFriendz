const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const fs = require('fs');
const path = require('path');
const { forwardAuthenticated, ensureAuthenticated } = require('../config/auth');
const multer = require('multer');

// Load Models
const User = require('../models/User');
const Chat = require('../models/Chat');
const Online = require('../models/Online');

router.get('/chatroom1', ensureAuthenticated, (req, res) => {
    Chat.find({}, (err, messages) => {
        if(err) {
            console.log(err);
        } else {
            res.render('chatroom', {
                title: 'Chat Room',
                logUser: req.user,
                messages: messages
            });
        }
    });
});

// New Message
router.post('/message', (req, res) => {
    const message = req.body.message;

    if(!message) {
        req.flash(
            'error_msg',
            'Please Type Something'
        );
        res.redirect(req.get('referer'));
    } else {
        let newChat = new Chat({
            user: req.user.username,
            message: req.body.message
        });

        newChat
            .save()
            .then(message => {
                res.redirect(req.get('referer'));
            })
            .catch(err => console.log(err));
    }
});

module.exports = router;