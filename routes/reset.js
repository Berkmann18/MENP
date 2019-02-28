const router = require('express').Router(),
  sgMail = require('@sendgrid/mail'),
  async = require('async');
const { emailError } = require('./generic');
const { error } = require('../src/utils');
const { User } = require('../src/model');
const config = require('../config/config');

if (process.env.SG_KEY === undefined) throw new Error('You need to set the process.env.SG_KEY in order to use this module');
sgMail.setApiKey(process.env.SG_KEY);

/**
 * @description Token-based reset page.
 */
router.get('/:token', (req, res) => {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
    if (err) error('Error:', err);
    if (!user) {
      req.flash('error', 'The password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {
      user: req.user,
      page: 'reset'
    });
  });
});

/**
 * @description Token-based reset form handler.
 */
router.post('/:token', (req, res) => {
  async.waterfall([
    (done) => {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
        if (err) error('Error:', err);
        if (!user) {
          req.flash('error', 'The password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save((err) => {
          if (err) {
            error('Post-registration login error', err);
            req.flash('error', `Post-registration login error (error ${err.statusCode}`)
          }
          req.logIn(user, (err) => done(err, user))
        });
      });
    },
    (user, done) => {
      let msg = {
        to: user.email,
        from: config.email.from,
        subject: '[INFO] Your password has been changed',
        text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n${config.esig}`
      };
      sgMail.send(msg, (err) => {
        if (err) emailError(req, err);
        else req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], (err) => {
    if (err) {
      error('Password resetting error', err);
      req.flash('error', `Password resetting error (${err.code} ${err.responseCode})`)
    }
    res.redirect('/')
  });
});

module.exports = router;