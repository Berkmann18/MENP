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
const {
  incomingIp,
  requireLogin,
  welcomeUser,
  httpPage,
  setColours,
  noSuchUser,
  _err,
  _warn,
  _inf
} = require('./generic');
const { User } = require('../src/model');

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
  User.findOne({ username: username }, (err, user) => {
    if (err) return done(err);
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    user.comparePassword(password, (err, isMatch) => {
      if (err) _err('LocalStrategy error:', err);
      return isMatch ? done(null, user) : done(null, false, { message: 'Incorrect password.' });
    });
  });
}));

/**
 * @description Universal route handler that indicates the incoming IP address.
 */
router.all('/*', (req, res, next) => {
  _inf(`Incoming IP: ${incomingIp(req)}`); //::1 if it's localhost (0:0:0:0:0:0:0:1)
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
 * @description 'About us' page containing a few bits from the README.md file
 */
router.get('/about', (req, res) => {
  res.render('index', {
    data: `<h1>About us</h1>
This is a sample MENP (MongoDB, Express, Node, Pug) web app (which uses Bootstrap and jQuery) made by Maximilian Berkmann.
<p><img src="img/mongodb.png" alt="M" class="tools" title="MongoDB" aria-label="MongoDB">
<img src="img/expressjs.png" alt="E" class="tools" title="Express" aria-label="Express">
<img src="img/nodejs-512.png" alt="N" class="tools" title="NodeJS" aria-label="NodeJS">
<img src="img/pugjs.png" alt="P" class="tools" title="Pug" aria-label="Pug"> +
<img src="img/bootstrap4.png" alt="B" class="tools" title="Bootstrap" aria-label="Bootstrap">
<img src="img/jquery-icon-17841.png" alt="jQ" class="tools" title="jQuery" aria-label="jQuery">
<img src="img/cheerio.png" alt="c" class="tools" title="Cheerio" aria-label="Cheerio">
<img src="img/nodemailer_sendgrid.png" alt="Nm+Sg" class="tools-wide" title="NodeMailer + Sendgrid" aria-label="NodeMailer + Sendgrid">
<img src="img/passport.png" alt="p" class="tools" title="Passport" aria-label="Passport">
<img src="img/helmet.png" alt="h" class="tools" title="Helmet" aria-label="Helmet">
<img src="img/nexmo.png" alt="n" class="tools" title="Nexmo" aria-label="Nexmo">
</p>
<p>
Basically: <ul>
    <li>MongoDB for the database</li>
    <li>NodeJS and Express for the server</li>
    <li>Pug for the view rendering and templating</li>
    <li>Boostrap for the UI</li>
    <li>jQuery and Cheerio for a sped up DOM access on both client and server sides</li>
    <li>NodeMailer + SendGrid for the emails</li>
    <li>Nexmo for the SMSs</li>
    <li>Passport for the authentication</li>
    <li>Helmet for the security</li>
</ul>
</p>`,
    user: req.user,
    page: 'about'
  });
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
        _warn('No user found pre-logout?');
        return;
      }
      user.lastSeen = new Date();
      user.save((err) => {
        if (err) {
          _err('Last seen logout save error:', err);
          req.flash('error', `Internal "last-seen" update issue (${err.code} ${err.responseCode})`)
        }
        _inf(`${user.username} <${user.email}> just logged out`);
      });
    });
  } else req.flash('error', 'Error in trying to logout from an account');
  req.logout();
  res.redirect('/');
});

/**
 * @description User account deletion page.
 */
router.get('/delete/:id', requireLogin, (req, res) => {
  if (req.user.id === req.params.id) {
    res.render('delete', {
      user: req.user
    });
  } else httpPage(401, res);
});

/**
 * @description User account deletion handler.
 */
router.post('/delete/:id', requireLogin, (req, res) => {
  User.findById(req.user.id, (err, user) => {
    if (err) _err('POST deletion error:', err);
    if (!user) {
      noSuchUser(req);
      return res.redirect('/');
    }
    user.remove((err) => {
      if (err) _err('User deletion error:', err);
      req.flash('success', 'User successfully deleted!');
      _inf(`${user.username} <${user.email}> is gone`);
      return res.redirect('/');
    });
  });
});

router.get('/tac', (req, res) => {
  res.render('page', {
    data: `<h1>Terms and conditions</h1>
    <p>
        In order to use the services provided by this web application ('MENP'), you agree to the following:
        <ol>
            <li>You will not commit any forms of illegal cyber-activities such as: bullying, scamming, phishing, stealing, ...</li>
            <li>You will keep private what needs to be kept within the boundary of this web application</li>
            <li>You accept to have a minimum of information known about you</li>
            <li>You acknowledge the necessity to use an up-to-date web-browser regardless of the platform(s) you use</li>
            <li>You will keep credits where their are due while respecting the copyrights surrounding this web application</li>
            <li>You accept that if you break any rules in this T&C you will have to accept consequences such as: being banned, taken to court, ...</li>
        </ol>
    </p>
    <a href="/register">Go back to the registration page</a>&nbsp; &nbsp;
    <a href="/">Go back to the home page</a>`
  })
});

router.get('/2fa', requireLogin, (req, res) => {
  res.render('2fa', {
    user: req.user,
    page: '2fa'
  });
});

router.post('/2fa', (req, res, next) => {
  User.findById(req.body.id, (err, user) => {
    if (err) _err('Error:', err);
    if (!user) {
      noSuchUser(req);
      _err('No such user with id=', req.body.id);
      return res.redirect('/login');
    }
    if (user.id !== req.body.id) {
      req.flash('error', 'The request originated from a different user. Aborting!');
      return httpPage(550, res);
    }
    if (!user.key) _err(`User ${user.username} doesn't have any key :(`);
    if (req.body.token === user.key && user.keyExpires > Date.now()) {
      req.flash('success', 'Successful Authentication!');
      req.logIn(user, (err) => {
        if (err) return next(err);
        user.lastSeen = new Date();
        user.save((err) => {
          if (err) _err('2FA error:', err);
          welcomeUser(req, user);
          _inf(`${user.username} <${user.email}> just logged in`);
          return res.redirect(`/usr/${user.id}`);
        });
      });
    } else {
      req.flash('error', 'The code you gave is the wrong one or it expired');
      res.redirect('/login');
    }
  });
});

module.exports = router;