const router = require('express').Router(),
  nodemailer = require('nodemailer'),
  sgTransport = require('nodemailer-sendgrid-transport'),
  async = require('async'),
  crypto = require('crypto');
const { _err, emailError } = require('./generic');
const { User } = require('../src/model');
const { url } = require('../src/utils');

/**
 * @description Password recovery page.
 */
router.get('/', (req, res) => res.render('forgot', {
  user: req.user,
  page: 'forgot'
}));

/**
 * @description Password recovery form handler.
 */
router.post('/', (req, res, next) => {
  async.waterfall([
    (done) => {
      crypto.randomBytes(20, (err, buf) => {
        let token = buf.toString('hex');
        done(err, token);
      });
    }, (token, done) => {
      if (req.body.email !== req.body.cemail) {
        req.flash('error', 'The email address isn\'t the same as its confirmation');
        res.render('forgot', {
          email: req.body.email
        });
        return false;

      }

      User.findOne({ email: req.body.email }, (err, user) => {
        if (err) _err('Error:', err);
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + config.tokenCooldown; //1 hour

        user.save((err) => done(err, token, user));
      });
    }, (token, user, done) => {
      let smtpTransport = nodemailer.createTransport(sgTransport(config.sgOptions)),
        mailOptions = {
          to: user.email,
          from: config.email.from,
          subject: '[ACTION] Password Reset',
          text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process:\n\n${url(req)}/reset/${token}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n${config.esig}`
        };
      smtpTransport.sendMail(mailOptions, (err) => {
        if (err) emailError(req, err);
        else req.flash('info', `An e-mail has been sent to ${user.email} with further instructions.`);
        done(err, 'done');
      });
    }
  ], (err) => {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

module.exports = router;