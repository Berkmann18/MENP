const router = require('express').Router(),
  passport = require('passport'),
  sgMail = require('@sendgrid/mail'),
  async = require('async'),
  crypto = require('crypto');
const { emailError, welcomeUser, sendSms } = require('./generic');
const config = require('../config/config');
const { url, error, info } = require('../src/utils');

if (process.env.SG_KEY === undefined) throw new Error('You need to set the process.env.SG_KEY in order to use this module');
sgMail.setApiKey(process.env.SG_KEY);

/**
 * @description Login page.
 */
router.get('/', (req, res) => res.render('login', {
  user: req.user,
  page: 'login'
}));

/**
 * @description Login form handler.
 */
router.post('/', (req, res, next) => {
  passport.authenticate('local', (err, user) => {
    if (err) return next(err);

    const login = () => {
      req.logIn(user, (err) => {
        if (err) {
          error('Login error:', err);
          return next(err);
        }
        user.lastSeen = new Date();
        user.save((err) => {
          if (err) error('Last seen login save error:', err);
          welcomeUser(req, user);
          info(`${user.username} <${user.email}> just logged in`);
          return res.redirect(`/usr/${user.id}`);
        });
      });
    };

    if (!user) {
      req.flash('error', 'The username/password is wrong'); //Not showing up
      return res.redirect('/login')
    }
    if (user.twoFA) {
      async.waterfall([
        (done) => {
          crypto.randomBytes(5, (err, buf) => {
            let token = buf.toString('hex');
            if (err) {
              error('Crypto gen error:', err);
              req.flash('error', `Error in generating the code (${err.code} ${err.responseCode})`);
            }
            done(err, token);
          });
        }, (token, done) => {
          const twoFaHandler = (token) => {
            user.key = token;
            user.keyExpires = Date.now() + config.tokenCooldown; //1 hour
            user.save((err) => {
              res.render('2fa', {
                user,
                page: '2fa'
              });
              if (err) {
                error('2FA handling error:', err);
                req.flash('error', `Error in the Authentication process (${err.code} ${err.responseCode})`);
              }
            });

            done(token);
          };
          if (user.twoFaMethod === 'sms') {
            sendSms(config.nexmoOptions.from, user.phone, `Your code is ${token}.`, (ans) => {
              if (process.env.NODE_ENV === 'development') _dbg('SMS callback response:', ans);
              twoFaHandler(token);
            });
          } else if (user.twoFaMethod === 'email') {
            twoFaHandler(token);
            let msg = {
              to: user.email,
              from: config.email.from,
              subject: '[ACTION] 2nd Factor Authentication',
              html: `<p>You are receiving this because you (or someone else) authenticated with your username/password and now need the code for the second factor of the authentication which is the following: <em>${token}</em></p><br>
                  <p>If you can't get the page to enter the code, you should see one pointing to <a href="${url(req)}/2fa">${url(req)}/2fa</a></p><br>
                  <p>If you did not request this, please ignore this email and your account won't be accessed.</p><br>${config.esig}`
            };
            sgMail
              .send(msg)
              .then(() => req.flash('info', 'Please see and enter the code you were sent.'),
                err => emailError(req, err));
          } else if (user.twoFaMethod === 'gauth') {
            req.flash('warning', 'Google Authentication isn\'t implemented yet.');
          } else req.flash('error', `${user.twoFaMethod} isn't supported (yet).`);
        }
      ], (token, err) => {
        if (err) error('2FA login error', err);
      });
    } else login();
  })(req, res, next);
});

module.exports = router;