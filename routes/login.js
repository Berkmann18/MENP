const router = require('express').Router(),
  passport = require('passport'),
  nodemailer = require('nodemailer'),
  sgTransport = require('nodemailer-sendgrid-transport'),
  async = require('async'),
  crypto = require('crypto');
const { _err, _inf, emailError, welcomeUser, sendSms } = require('./generic');
const config = require('../config/config');
const { url } = require('../src/utils');

/* router.use(session({
  secret: '3nj0y 1t!',
  name: 'sessionID',
  resave: false, //Do not automatically write to the session store
  saveUninitialized: true, //Save new sessions
  cookie: {
    //secure: true,
    httpOnly: true,
    expires: new Date(Date.now() + 24 * config.tokenCooldown) //1 day
  }
})); */

// router.use(passport.initialize());
// router.use(passport.session());

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
          _err('Login error:', err);
          return next(err);
        }
        user.lastSeen = new Date();
        user.save((err) => {
          if (err) _err('Last seen login save error:', err);
          welcomeUser(req, user);
          _inf(`${user.username} <${user.email}> just logged in`);
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
          crypto.randomBytes(4, (err, buf) => {
            let token = buf.toString('hex');
            if (err) {
              _err('Crypto gen error:', err);
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
                _err('2FA handling error:', err);
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
            let smtpTransport = nodemailer.createTransport(sgTransport(config.sgOptions)),
              mailOptions = {
                to: user.email,
                from: config.email.from,
                subject: '[ACTION] 2nd Factor Authentication',
                html: `<p>You are receiving this because you (or someone else) authenticated with your username/password and now need the code
                            for the second factor of the authentication which is the following: <em>${token}</em></p><br>
                            <p>If you can't get the page to enter the code, you should see one pointing to
                            <a href="${url(req)}/2fa">${url(req)}/2fa</a></p><br>
                            <p>If you did not request this, please ignore this email and your account won't be accessed.</p><br>${config.esig}`
              };
            smtpTransport.sendMail(mailOptions, (err) => {
              if (err) emailError(req, err);
              else {
                req.flash('info', 'Please see and enter the code you were sent.');
              }
            });
          }

        }
      ], (token, err) => {
        if (err) _err('2FA login error', err);
      });
    } else login();
  })(req, res, next);
});

module.exports = router;