/* eslint-env es6, node */
/**
 * @description Main route for the MENP app.
 * @module index
 * @requires express, express-session, mongoose, nodemailer, passport, passport-local, async, crypto, express-flash, validator, cheerio,
 * promise, cors, nodemailer-sendgrid-transport
 * @requires ../config/config, ./generic
 * @exports router
 * @todo Fix the impossibility to register on production mode
 */

const session = require('express-session'),
  passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  flash = require('express-flash'),
  router = require('express').Router();
const config = require('../config/config');
const { incomingIp } = require('./generic');
const { User } = require('../src/model');
const { setColours, error, info, warn } = require('../src/utils');

setColours();

router.use(session({
  secret: '3nj0y 1t!',
  name: 'sessionID',
  resave: false, //Do not automatically write to the session store
  saveUninitialized: true, //Save new sessions
  cookie: {
    //secure: true,
    httpOnly: true,
    expires: new Date(Date.now() + 24 * config.tokenCooldown) //1 day
  }
}));

router.use(flash());
router.use(passport.initialize());
router.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => User.findById(id, (err, user) => done(err, user)));
passport.use(new LocalStrategy((username, password, done) => {
  User.findOne({ username }, (err, user) => {
    if (err) return done(err);
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    user.comparePassword(password, (err, isMatch) => {
      if (err) error('LocalStrategy error:', err);
      return isMatch ? done(null, user) : done(null, false, { message: 'Incorrect password.' });
    });
  });
}));

/**
 * @description Universal route handler that indicates the incoming IP address.
 */
router.all('/*', (req, res, next) => {
  info(`Incoming IP: ${incomingIp(req)}`); //::1 if it's localhost (0:0:0:0:0:0:0:1)
  res.header('Access-Control-Allow-Origin', config.urlWhiteList.toString());
  next();
});

/**
 * @description Landing page of the application.
 */
router.get('/', (req, res) => {
  res.render('index', {
    data: `<h1>Welcome</h1>
        <img src="img/favicon.png" alt="MENP" class="float-left">
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        `,
    user: req.user,
    page: 'home'
  })
});

/**
 * @description Sitemap page.
 */
router.get('/sitemap', (req, res) => res.render('sitemap', {
  user: req.user,
  page: 'sitemap'
}));

/**
 * @description Logout handler.
 */
router.get('/logout', (req, res) => {
  if (req.user) {
    User.findById(req.body.id, (err, user) => {
      if (!user) {
        let errCode = err ? ` (error ${err.code})` : '';
        req.flash('error', `The user account you tried to logout from wasn't found${errCode}`);
        warn('No user found pre-logout?');
        return;
      }
      user.lastSeen = new Date();
      user.save((err) => {
        if (err) {
          error('Last seen logout save error:', err);
          req.flash('error', `Internal "last-seen" update issue (${err.code} ${err.responseCode})`)
        }
        info(`${user.username} <${user.email}> just logged out`);
      });
    });
  } else req.flash('error', 'Error in trying to logout from an account');
  req.logout();
  res.redirect('/');
});

module.exports = router;