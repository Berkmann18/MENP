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
  nodemailer = require('nodemailer');
const passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  async = require('async'),
  crypto = require('crypto');
const flash = require('express-flash'),
  validator = require('validator'),
  sgTransport = require('nodemailer-sendgrid-transport');
const router = require('express').Router(),
  cheerio = require('cheerio');
const $ = cheerio.load('<body>...</body>'),
  cors = require('cors');
const config = require('../config/config');
const {
  incomingIp,
  requireLogin,
  welcomeUser,
  sendSms,
  httpPage,
  setColours,
  noSuchUser,
  emailError,
  execCaptcha,
  _err,
  _dbg,
  _warn,
  _inf
} = require('./generic');
const { User } = require('../src/model');
const tokenCooldown = 36e5; //1h in ms

let esig = 'Best regards,\nMENP team\n';

let urlWhiteList = ['https://localhost', 'http://localhost'],
  /*corsOptions = {
     origin: (origin, callback) => {
       _warn('Origin:', origin);
       (urlWhiteList.indexOf(origin) !== -1) ? callback(null, true) : callback(new Error('Not allowed by CORS'))
     }
   }*/
  corsOptionsDelegate = (req, callback) => {
    let corsOptions = { origin: (urlWhiteList.indexOf(req.header('Origin')) !== -1) };
    //Reflect (enable) the requested origin in the CORS response or disable CORS for this request
    callback(null, corsOptions) //Callback expects two parameters: error and options
  },
  url = (req) => `${req.protocol}://${req.headers.host}`;

setColours();

router.use(session({
  secret: '3nj0y 1t!',
  name: 'sessionID',
  resave: false, //Do not automatically write to the session store
  saveUninitialized: true, //Save new sessions
  cookie: {
    //secure: true,
    httpOnly: true,
    expires: new Date(Date.now() + 24 * tokenCooldown) //1 day
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
  res.header('Access-Control-Allow-Origin', urlWhiteList.toString());
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
 * @description Login page.
 */
router.get('/login', (req, res) => res.render('login', {
  user: req.user,
  page: 'login'
}));

/**
 * @description Login form handler.
 */
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user) => {
    if (err) return next(err);
    let login = () => {
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
      req.flash('error', 'The username/password is wrong');
      return res.redirect('/login');
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
          let twoFaHandler = (token) => {
            user.key = token;
            user.keyExpires = Date.now() + tokenCooldown; //1 hour
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
                            <p>If you did not request this, please ignore this email and your account won't be accessed.</p><br>${esig}`
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

router.options('/register', cors());
/**
 * @description Registration page.
 */
router.get('/register', cors(corsOptionsDelegate), (req, res) => {
  execCaptcha((token) => {
    res.render('register', {
      page: 'register',
      captcha: token
    })
  });

});

/**
 * @description Registration form handler.
 */
router.post('/register', (req, res) => {
  const switch2bool = (val) => (val === 'on' || val === 'enabled'),
    keepDetails = () => {
      execCaptcha((token) => {
        res.render('register', {
          title: req.body.title,
          fname: req.body.fname,
          lname: req.body.lname,
          username: req.body.username,
          email: req.body.email,
          twoFA: switch2bool(req.body.twoFA),
          twoFaMethod: req.body.twoFaMethod,
          phone: req.body.phone,
          page: 'register',
          captcha: token
        })
      });
    };
  let wrongs = false,
    twoFA = switch2bool(req.body.twoFA);

  User.findOne({ email: req.body.email }, (err, user) => {
    if (err) _err('Error:', err);
    if (user) {
      req.flash('error', 'The email address is already used by an existing account');
      wrongs = true;
    }
  }).then(User.findOne({ username: req.body.username }, (err, user) => {
    if (err) _err('Error:', err);
    if (user) {
      req.flash('error', 'The username is already used by an existing account');
      wrongs = true;
    }
  })).then(() => {
    if (!validator.isEmail(req.body.email)) {
      $('#emailchk').html('<span style="color: red;">The email address isn\'t valid</span>');
      wrongs = true;
    }
    if (req.body.password.length < 8) {
      req.flash('warning', 'The password is too weak.\nPlease make sure it\'s 8+ characters long');
      wrongs = true;
    }
    if (req.body.cpw !== req.body.password) {
      req.flash('error', 'The confirmation password must be identical to the password');
      wrongs = true;
    }

    if (twoFA && req.body.twoFaMethod === 'sms' && !(req.body.phone && validator.isMobilePhone(req.body.phone))) {
      req.flash('error', 'Invalid phone number');
      $('#phonechk').html('<span style="color: red;">The phone number isn\'t valid</span>');
      wrongs = true;
    }

    if (req.body.captcha !== req.body.cct) {
      req.flash('error', 'The captcha is wrong');
      wrongs = true;
    }

    if (wrongs) {
      keepDetails();
      return false;
    } //Allow to display all issues with the form in one go and to minimise POST requests

    let usr = {
      title: req.body.title,
      fname: req.body.fname,
      lname: req.body.lname,
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      registerDate: new Date(),
      type: 'member',
      twoFA,
      twoFaMethod: twoFA ? req.body.twoFaMethod : '',
      phone: (twoFA && req.body.twoFaMethod === 'sms') ? req.body.phone : ''
    };

    // console.log('usr:');
    // console.dir(usr);

    let user = new User(usr);

    user.save((err) => {
      if (err) {
        req.flash('error', `Something went wrong in the registration (${err.code} ${err.responseCode})`);
        _err('Failed registration:', err);
      }
      req.flash('success', 'Registration successful!');
      _inf(`${user.username} <${user.email}> just registered`);
      req.logIn(user, (err) => {
        if (err) {
          let msg = 'Post-registration login error';
          _err(msg, err);
          req.flash('error', `${msg} (error ${err.statusCode}`)
        }
        res.redirect(`/usr/${user.id}`)
      });

      let smtpTransport = nodemailer.createTransport(sgTransport(config.sgOptions)),
        mailOptions = {
          to: user.email,
          from: config.email.from,
          subject: '[INFO] Welcome to MENP',
          html: `Hello <em>${user.username}</em>,<br>Welcome to MENP! I hope you'll enjoy using our application.<br>Best regards,<br>MENP Team`
        };
      smtpTransport.sendMail(mailOptions, (err) => {
        if (err) emailError(req, err);
      });
    });
  }).catch(err => _err(err));
});

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
 * @description Password recovery page.
 */
router.get('/forgot', (req, res) => res.render('forgot', {
  user: req.user,
  page: 'forgot'
}));

/**
 * @description Password recovery form handler.
 */
router.post('/forgot', (req, res, next) => {
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
        user.resetPasswordExpires = Date.now() + tokenCooldown; //1 hour

        user.save((err) => done(err, token, user));
      });
    }, (token, user, done) => {
      let smtpTransport = nodemailer.createTransport(sgTransport(config.sgOptions)),
        mailOptions = {
          to: user.email,
          from: config.email.from,
          subject: '[ACTION] Password Reset',
          text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process:\n\n${url(req)}/reset/${token}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n${esig}`
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

/**
 * @description Token-based reset page.
 */
router.get('/reset/:token', (req, res) => {
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
router.post('/reset/:token', (req, res) => {
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
      let smtpTransport = nodemailer.createTransport(config.smtp),
        mailOptions = {
          to: user.email,
          from: config.email.from,
          subject: '[INFO] Your password has been changed',
          text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n${esig}`
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

router.post('/2fa', /*requireLogin,*/ (req, res, next) => {
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