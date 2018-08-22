const router = require('express').Router(),
  nodemailer = require('nodemailer'),
  sgTransport = require('nodemailer-sendgrid-transport'),
  async = require('async');
const { _err, emailError } = require('./generic');
const { User } = require('../src/model');
const config = require('../config/config');

/**
 * @description Token-based reset page.
 */
router.get('/:token', (req, res) => {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
    if (err) _err('Error:', err);
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
        if (err) _err('Error:', err);
        if (!user) {
          req.flash('error', 'The password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save((err) => {
          if (err) {
            _err('Post-registration login error', err);
            req.flash('error', `Post-registration login error (error ${err.statusCode}`)
          }
          req.logIn(user, (err) => done(err, user))
        });
      });
    },
    (user, done) => {
      let smtpTransport = nodemailer.createTransport(sgTransport(config.sgOptions)),
        mailOptions = {
          to: user.email,
          from: config.email.from,
          subject: '[INFO] Your password has been changed',
          text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n${config.esig}`
        };
      smtpTransport.sendMail(mailOptions, (err) => {
        if (err) emailError(req, err);
        else req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], (err) => {
    if (err) {
      _err('Password resetting error', err);
      req.flash('error', `Password resetting error (${err.code} ${err.responseCode})`)
    }
    res.redirect('/')
  });
});

module.exports = router;