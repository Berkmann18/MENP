/**
 * @description Main route for the MENP app.
 * @module index
 * @requires express, express-session, mongoose, nodemailer, passport, passport-local, bcrypt-nodejs, async, crypto, express-flash, validator, cheerio, promise, sweetalert
 * @requires ../config/config, ./generic
 * @exports router
 */

/* eslint-env es6, node */

/**
 * @todo Fix the issue with users not being able to go on their edit page
 * @todo Add a token (2FA code) expiry date (like the reset code), add the option to choose the 2FA method
 * @todo Implement email based 2FA
 * @todo Add more security with helmet
 * @todo Fix the impossibility to register on production mode
 */

const session = require('express-session'), mongoose = require('mongoose'), nodemailer = require('nodemailer');
const passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt-nodejs'), async = require('async'), crypto = require('crypto');
const flash = require('express-flash'), validator = require('validator'), sgTransport = require('nodemailer-sendgrid-transport');
const router = require('express').Router()/*, path = require('path')*/, cheerio = require('cheerio');
const $ = cheerio.load('<body>...</body>'), Promise = require('promise')/*, swal = require('sweetalert')*/;
const config = require('../config/config'), helmet = require('helmet'), RateLimit = require('express-rate-limit');
const {
  incomingIp, requireLogin, adminOnly, memberOnly, sameUserOnly,
  sendSms, httpPage, setColours, clr, noSuchUser, emailError, execCaptcha} = require('./generic');
const limiter = new RateLimit({
    windowMs: 15 * 6e3, //15 minutes
    max: 100, //Limit each IP to 100 requests per windowMs
    delayMs: 0 //Disable delaying - full speed until the max limit is reached
  }), tokenCooldown = 36e5; //1h in ms

let esig = 'Best regards,\nMENP team\n';

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
  /*store: new MongoStore({
        mongooseConnection: config.db,
        ttl: (3600 * 24)
    })*/
}));

router.use(helmet({
  frameguard: {action: 'deny'}, //No I-frame uses
}));
router.use(helmet.xssFilter());
router.use(limiter);
/*router.disable('x-powered-by')*/
router.use(flash());
router.use(passport.initialize());
router.use(passport.session());
// router.use(router.csrf()); //Cross-Site Request Forgery protection
router.use((req, res, next) => {
  //res.locals.csrftoken = req.session._csrf;
  next();
});

mongoose.connect(config.db, {useMongoClient: true}, (err) => {
  if (err) console.log(clr.err('Mongoose: Error='), err);
});

let userSchema = new mongoose.Schema({
  title: {type: String, require: true},
  fname: {type: String, required: true},
  lname: {type: String, required: true},
  username: {type: String, required: true, unique: true},
  email: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  registerDate: {type: Date, required: true},
  lastSeen: {type: Date},
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  type: {type: String, default: 'member'},
  twoFA: {type: Boolean, required: true, default: false},
  twoFaMethod: String,
  phone: String,
  key: String,
  keyExpires: Date
});

userSchema.pre('save', function(next) {
  let user = this, SALT_FACTOR = 5;

  if (!user.isModified('password')) return next();

  bcrypt.genSalt(SALT_FACTOR, (err, salt) => {
    if (err) return next(err);

    bcrypt.hash(user.password, salt, null, (err, hash) => {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

mongoose.Promise = Promise;
let User = mongoose.model('User', userSchema);
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => User.findById(id, (err, user) => done(err, user)));
passport.use(new LocalStrategy((username, password, done) => {
  User.findOne({username: username}, (err, user) => {
    if (err) return done(err);
    if (!user) return done(null, false, {message: 'Incorrect username.'});
    user.comparePassword(password, (err, isMatch) => {
      return isMatch ? done(null, user) : done(null, false, {message: 'Incorrect password.'});
    });
  });
}));

/**
 * @description Universal route handler that indicates the incoming IP address.
 */
router.all('/*', (req, res, next) => {
  let iip = incomingIp(req); //::1 if it's localhost (0:0:0:0:0:0:0:1)
  console.log(clr.inf(`Incoming IP: ${iip}`));
  next();
});

/**
 * @description Landing page of the application.
 */
router.get('/', (req, res) => res.render('index', {
  data: `<h1>Welcome</h1>
        <img src="img/favicon.png" alt="MENP" class="float-left">
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        `,
  user: req.user,
  page: 'home'
}));

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
<img src="img/bootstrap-4.svg" alt="B" class="tools" title="Bootstrap" aria-label="Bootstrap">
<img src="img/jquery-icon-17841.png" alt="jQ" class="tools" title="jQuery" aria-label="jQuery">
<img src="img/cheerio.png" alt="c" class="tools" title="Cheerio" aria-label="Cheerio">
<img src="img/nodemailer_sendgrid.png" alt="Nm+Sg" class="tools-wide" title="NodeMailer + Sendgrid" aria-label="NodeMailer + Sendgrid">
<img src="img/passport.png" alt="p" class="tools" title="Passport" aria-label="Passport">
</p>
<p>
Basically: <ul>
    <li>MongoDB for the database</li>
    <li>NodeJS and Express for the server</li>
    <li>Pug for the view rendering and templating</li>
    <li>Boostrap for the UI</li>
    <li>jQuery and Cheerio for a sped up DOM access on both client and server sides</li>
    <li>NodeMailer + SendGrid for the emails</li>
    <li>Passport for the authentication</li>
</ul>
</p>`,
    user: req.user,
    page: 'about'
  });
});

/**
 * @description 'Contact us' page.
 */
router.get('/contact', (req, res) => res.render('contact', {
  user: req.user,
  page: 'contact'
}));

/**
 * @description 'Contact us' form handler.
 */
router.post('/contact', (req, res) => {
  let keepDetails = () => res.render('contact', {
    name: req.body.name,
    email: req.body.email,
    subject: req.body.subject,
    message: req.body.message,
    page: 'contact'
  });
  if (!validator.isEmail(req.body.email)) {
    req.flash('error', 'The email isn\'t valid');
    return keepDetails();
  }
  let smtpTransport = nodemailer.createTransport(sgTransport(config.sgOptions)), mailOptions = {
    to: config.email.to,
    from: req.body.email,
    subject: req.body.subject || '[?] No subject',
    text: `Contact email from ${req.body.name}:\n\n${req.body.message}`
  };
  smtpTransport.sendMail(mailOptions, (err) => {
    if (err) emailError(req, err);
    else req.flash('info', 'The email was sent! Thank you for your interest.');
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
        if (err) return next(err);
        user.lastSeen = new Date();
        user.save((err) => {
          if (err) console.log(clr.err('Last seen login save error:'), err);
          req.flash('success', `Welcome "${user.title}. ${user.fname} ${user.lname}"`);
          console.log(clr.inf(`${user.username} <${user.email}> just logged in`));
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
              console.log(clr.err('Crypto gen error'), err);
              req.flash('error', `Error in generating the code (error ${err.statusCode})`);
            }
            done(err, token);
          });
        }, (token, done) => {
          //console.log('Token', token);
          let twoFaHandler = (token) => {
            user.key = token;
            user.keyExpires = Date.now() + tokenCooldown; //1 hour
            user.save((err) => {
              res.render('2fa', {
                user,
                page: '2fa'
              });
              // console.log(clr.debug('Expecting token:'), token);
              if (err) {
                console.log(clr.err('2FA handling error'), err);
                req.flash('error', `Error in the Authentication process (error ${err.statusCode})`);
              }
              //done(err, token, user);
            });

            done(token);
            //login()
          };
          console.log('2FA w/', user.twoFaMethod);
          if (user.twoFaMethod === 'sms') {
            sendSms(config.nexmoOptions.from, user.phone, `Your code is ${token}.`, (ans) => {
              console.log(clr.debug('SMS callback response: '), ans);
              twoFaHandler(token);
            });
          } else if (user.twoFaMethod === 'email') {
            twoFaHandler(token);
            let smtpTransport = nodemailer.createTransport(sgTransport(config.sgOptions)), mailOptions = {
              to: user.email,
              from: config.email.from,
              subject: '[ACTION] 2nd Factor Authentication',
              html: `<p>You are receiving this because you (or someone else) authenticated with your username/password and now need the code
                            for the second factor of the authentication which is the following: <em>${token}</em></p><br>
                            <p>If you can't get the page to enter the code, you should see one pointing to
                            <a href="http://${req.headers.host}/2fa">http://${req.headers.host}/2fa</a></p><br>
                            <p>If you did not request this, please ignore this email and your account won't be accessed.</p><br>${esig}`
            };
            smtpTransport.sendMail(mailOptions, (err) => {
              if (err) emailError(req, err);
              else {
                req.flash('info', 'Please see and enter the code you were sent.');
                //twoFaHandler(token);
              }
              //done(err, 'done');
            });
          }

        }], (token, err) => {
        if (err) {
          console.log(clr.err('2FA login error'), err);
          //return next(err);
        } //else res.redirect('/login');
      });
    } else login();
  })(req, res, next);
});

/**
 * @description Registration page.
 */
router.get('/register', (req, res) => {
  execCaptcha((token) => {
    // console.log('Captcha token:', token);
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
  let keepDetails = () => {
      execCaptcha((token) => {
        res.render('register', {
          title: req.body.title,
          fname: req.body.fname,
          lname: req.body.lname,
          username: req.body.username,
          email: req.body.email,
          twoFA: req.body.twoFA,
          twoFaMethod: req.body.twoFaMethod,
          phone: req.body.phone,
          page: 'register',
          captcha: token
        })
      });
    }, wrongs = false;

  User.findOne({email: req.body.email}, (err, user) => {
    if (user) {
      req.flash('error', 'The email address is already used by an existing account');
      //console.log('Email already used');
      wrongs = true;
    } //else console.log('Email fine');
  }).then(User.findOne({username: req.body.username}, (err, user) => {
    if (user) {
      req.flash('error', 'The username is already used by an existing account');
      //console.log('Un already used');
      wrongs = true;
    } //else console.log('Username fine');
  })).then(() => {
    if (!validator.isEmail(req.body.email)) {
      //req.flash('error', 'The email address isn\'t valid');
      $('#emailchk').html('<span style="color: red;">The email address isn\'t valid</span>');
      //console.log('Email not valid');
      wrongs = true;
    } //else console.log('Email good');
    if (req.body.password.length < 8) {
      req.flash('warning', 'The password is too weak.\nPlease make sure it\'s 8+ characters long');
      //console.log('Password too short');
      wrongs = true;
    } //else console.log('Password fine');
    if (req.body.cpw !== req.body.password) {
      req.flash('error', 'The confirmation password must be identical to the password');
      //console.log('Password not confirmed');
      wrongs = true;
    } //else console.log('Conf fine');

    if (req.body.twoFaMethod === 'sms' && !(req.body.phone && validator.isMobilePhone(req.body.phone))) {
      req.flash('error', 'Invalid phone number');
      $('#phonechk').html('<span style="color: red;">The phone number isn\'t valid</span>');
      wrongs = true;
    }

    if (req.body.captcha !== req.body.cct) {
      req.flash('error', 'The captcha is wrong');
      console.log('Wrong captcha');
      wrongs = true;
    } else console.log('Captcha fine');

    if (wrongs) {
      keepDetails();
      console.log('Going again');
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
      twoFA: req.body.twoFA,
      twoFaMethod: req.body.twoFaMethod,
      phone: (req.body.twoFA && req.body.twoFaMethod === 'sms') ? req.body.phone : ''
    };

    let user = new User(usr);

    user.save((err) => {
      if (err) {
        req.flash('error', `Something went wrong in the registration (error ${err.statusCode})`);
        console.log(clr.err('Failed registration:'), err);
      }
      req.flash('success', 'Registration successful!');
      console.log(clr.inf(`${user.username} <${user.email}> just registered`));
      req.logIn(user, (err) => {
        if (err) {
          console.log(clr.err('Post-registration login error'), err);
          req.flash('error', `Post-registration login error (error ${err.statusCode}`)
        }
        res.redirect(`/usr/${user.id}`)
      });

      let smtpTransport = nodemailer.createTransport(sgTransport(config.sgOptions)), mailOptions = {
        to: user.email,
        from: config.email.from,
        subject: '[INFO] Welcome to MENP',
        text: `Hello ${user.username},\nWelcome to MENP! I hope you'll enjoy using our application.\n${esig}`
      };
      smtpTransport.sendMail(mailOptions, (err) => {
        if (err) emailError(req, err);
      });
    });
  }).catch(err => console.log(clr.err(err)));
});

/**
 * @description Logout handler.
 */
router.get('/logout', (req, res) => {
  if (req.user) {
    User.findById(req.body.id, (err, user) => {
      if (!user) {
        req.flash('error', `The user account you tried to logout from wasn't found (error ${err.statusCode})`);
        console.log(clr.warn('No user found pre-logout?'));
        return;
      }
      user.lastSeen = new Date();
      user.save((err) => {
        if (err) {
          console.log(clr.err('Last seen logout save error:'), err);
          req.flash('error', `Internal "last-seen" update issue (error ${err.statusCode})`)
        }
        console.log(clr.inf(`${user.username} <${user.email}> just logged out`));
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

      User.findOne({email: req.body.email}, (err, user) => {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + tokenCooldown; //1 hour

        user.save((err) => done(err, token, user));
      });
    }, (token, user, done) => {
      let smtpTransport = nodemailer.createTransport(sgTransport(config.sgOptions)), mailOptions = {
        to: user.email,
        from: config.email.from,
        subject: '[ACTION] Password Reset',
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
                Please click on the following link, or paste this into your browser to complete the process:\n\n
                http://${req.headers.host}/reset/${token}\n\n
                If you did not request this, please ignore this email and your password will remain unchanged.\n${esig}`
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
  User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}}, (err, user) => {
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
      User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}}, (err, user) => {
        if (!user) {
          req.flash('error', 'The password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save((err) => {
          if (err) {
            console.log(clr.err('Post-registration login error'), err);
            req.flash('error', `Post-registration login error (error ${err.statusCode}`)
          }
          req.logIn(user, (err) => done(err, user))
        });
      });
    },
    (user, done) => {
      let smtpTransport = nodemailer.createTransport(config.smtp), mailOptions = {
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
      console.log(clr.err('Password resetting error'), err);
      req.flash('error', `Password resetting error (error ${err.statusCode}`)
    }
    res.redirect('/')
  });
});

/**
 * @description Global admin page authorisation system.
 */
router.all('/admin/*', adminOnly, (req, res, next) => next());

/**
 * @description Admin page.
 * @protected
 */
router.get('/admin', adminOnly, (req, res) => {
  /*swal({
        title: 'Password',
        input: 'text',
        confirmButtonText: 'Enter',
        allowOutsideClick: false,
        confirmButtonAriaLabel: 'Enter'
    }).then((result) => {
        if (result.value && result.value === 'MenpAdmin') showTable();
        else if (result.dismiss === 'cancel') res.redirect('/');
    });*/

  let cols = ['title', 'fname', 'lname', 'username', 'email', 'password', 'registerDate', 'lastSeen', 'id', 'type'];
  let usrlist = '<table class="table"><caption>Users</caption><tr>', nb = 0;
  for (let col of cols) usrlist += `<th>${col}</th>`;
  usrlist += '</tr>';
  User.find({}, (err, users) => {
    if (!users) {
      req.flash('error', 'No users :(');
      return res.redirect('/');
    }
    for (let user of users) {
      usrlist += '<tr>';
      for (let col of cols) usrlist += `<td>${user[col]}</td>`;
      usrlist += '</tr>';
      nb++;
    }
    usrlist += `</table><p><em>${nb}</em> users</p>
        <ul class="nav nav-pills mb-3" id="pills-tab" role="tablist">
          <li class="nav-item">
            <a class="nav-link active" id="pills-edit-tab" data-toggle="pill" href="#pills-edit" role="tab" aria-controls="pills-edit" aria-selected="true">Edit</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" id="pills-remove-tab" data-toggle="pill" href="#pills-remove" role="tab" aria-controls="pills-remove" aria-selected="false">Remove</a>
          </li>
        </ul>
        <div class="tab-content" id="pills-tabContent">
        <div class="tab-pane fade show active" id="pills-edit" role="tabpanel" aria-labelledby="pills-edit-tab">
            <form name="usrChange" method="POST" action="/admin/ch/">
                <div class="form-group">
                    <label for="id">Id:</label>
                    <input name='id' class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="fname">First name:</label>
                    <input name='fname' class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="lname">Last name:</label>
                    <input name='lname' class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="username">Username:</label>
                    <input name='username' class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input name='email' type="email" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="type">Type:</label>
                    <input name='type' class="form-control" required value="member">
                </div>
                <input type="submit" class="btn btn-success btn-block" value="Update">
                <input type="reset" class="btn btn-default btn-block" value="Reset">
            </form>
        </div>
        <div class="tab-pane fade" id="pills-remove" role="tabpanel" aria-labelledby="pills-remove-tab">
          <form name="usrRemove" method="POST" action="/admin/rm/">
                <div class="form-group">
                    <label for="id">Id:</label>
                    <input name='id' class="form-control" required>
                </div>
                <input type="submit" class="btn btn-danger btn-block" value="Remove">
          </form>
        </div>
        </div>
        `;
    res.render('page', {
      data: usrlist,
      user: req.user
    });
  });
});

/**
 * @description Admin User change page.
 * @protected
 */
router.get('/admin/ch', adminOnly, (req, res, next) => {
  User.findById(req.body.id, (err, user) => {
    if (!user) {
      noSuchUser();
      return res.redirect('back');
    }
    if (!validator.isEmail(req.body.email)) {
      req.flash('error', 'The email address isn\'t valid');
      return res.redirect('back');
    }
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;
    user.fname = req.body.fname || user.fname;
    user.lname = req.body.lname || user.lname;
    user.type = req.body.type || user.type;
    req.flash('success', 'Information updated');
    user.save((err) => {
      if (err) console.log(clr.err('Admin authored change error:'), err);
    });
    next(); //This may need to be moved to user.save
  });
});

/**
 * @description Members list.
 * @protected
 */
router.get('/users', memberOnly, (req, res) => {
  let cols = ['username', 'registerDate', 'lastSeen', 'type'], visualCols = ['Username', 'Registration date', 'Last seen', 'Group'];
  let usrlist = '<table class="table"><caption>Users</caption><tr>', nb = 0;
  for (let col of visualCols) usrlist += `<th>${col}</th>`;
  usrlist += '</tr>';
  User.find({}, (err, users) => {
    if (!users) {
      req.flash('error', 'No users :(');
      return res.redirect('/');
    }
    for (let user of users) {
      usrlist += '<tr>';
      for (let col of cols) {
        usrlist += (col === 'username') ? `<td><a href="/user/@${user[col]}">${user[col]}</a></td>` : `<td>${user[col]}</td>`;
      }
      usrlist += '</tr>';
      nb++;''
    }
    usrlist += `</table><p><em>${nb}</em> users (as of ${new Date()})</p>`;
    res.render('page', {
      data: usrlist,
      user: req.user,
      page: 'users'
    });
  });
});

/**
 * @description User page where a user can see his/her informations.
 */
router.get('/usr/:id', sameUserOnly, (req, res) => {
  User.findById(req.params.id, (err, user) => {
    if (!user) {
      console.log(clr.err('No user with id'), req.params.id);
      noSuchUser();
      return res.redirect('/');
    }
    res.render('user', {user, visitedUser: user, same: true});
  });
});

/**
 * @description User page where a user can update his/her informations.
 */
router.get('/usr/:id/edit', sameUserOnly, (req, res) => {
  User.findById(req.params.id, (err, user) => {
    if (!user) {
      console.log(clr.err('No user with id'), req.params.id);
      noSuchUser();
      return res.redirect('/');
    }
    res.render('update', {user});
  });
});

/**
 * @description User account update form handler.
 */
router.post('/usr/:id/edit', (req, res) => {
  User.findById(req.params.id, (err, user) => {
    if (!user) {
      noSuchUser();
      return res.redirect('/');
    }
    let keepDetails = () => {
        return res.render('update', {
          user: {
            title: req.body.title,
            type: req.body.type,
            fname: req.body.fname,
            lname: req.body.lname,
            username: req.body.username,
            email: req.body.email,
            id: req.params.id,
            twoFA: req.body.twoFA,
            phone: req.body.phone
          }
        });
      }, updateDetail = (field) => {
        user[field] = req.params[field] || req.body[field] || user[field];
        // console.log(`Changing ${field} to ${user[field]}`, req.body[field], req.params[field]);
      };

    if (!validator.isEmail(req.body.email)) {
      req.flash('error', 'The email address isn\'t valid');
      keepDetails();
    }
    if (req.body.password.length < 8) req.flash('warning', 'The password is too weak.\nPlease make sure it\'s 8+ characters long');
    if (req.body.confirm !== req.body.password) {
      req.flash('error', 'The confirmation password must be identical to the password');
      keepDetails();
    }

    updateDetail('title');
    updateDetail('fname');
    updateDetail('lname');
    updateDetail('username');
    updateDetail('email');
    updateDetail('password');
    updateDetail('twoFA');
    updateDetail('phone');

    user.save((err) => {
      if (err) {
        console.log(clr.err('Update error:'), err);
        req.flash('error', `There was an error in the information update (error ${err.statusCode})`);
      } else {
        res.render('update', {user});
        req.flash('success', 'Information updated');
      }
    });

  });
});

/**
 * @description User account deletion page.
 */
router.get('/delete/:id', requireLogin, (req, res) => {
  console.log('req uid=', req.user.id);
  console.log('param id=', req.params.id);
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
    if (!user) {
      noSuchUser();
      return res.redirect('/');
    }
    user.remove((err) => {
      if (err) throw err;
      req.flash('success', 'User successfully deleted!');
      console.log(clr.inf(`${user.username} <${user.email}> is gone`));
      return res.redirect('/');
    });
  });
});

/**
 * @description User page where a user can see a user's page.
 */
router.get('/user/@:username', requireLogin, (req, res) => {
  User.findOne({username: req.params.username}, (err, visitedUser) => {
    if (!visitedUser) {
      console.log(clr.warn('No user with username'), req.params.username);
      noSuchUser();
      httpPage(404, res);
    } else res.render('user', {visitedUser, user: req.user});
  });
});

/*User.findById(req.user.id, (err, user) => {
    if (!user) {
        noSuchUser();
        return res.redirect('/');
    }
    user.remove((err) => {
        if (err) throw err;
        req.flash('success', 'User successfully deleted!');
        return res.redirect('/');
    });
});*/

/*
/!**
 * @description Encrypt data.
 * @param {*} data Data to encrypt
 * @param {number} [rounds=5] Number of salting rounds
 * @return Encrypted data
 *!/
let encrypt = (data, rounds=5) => bcrypt.hashSync(data, bcrypt.genSaltSync(rounds), null);
router.get('/xpw/:pw', (req, res) => {
    res.render('page', {
       data: `<strong>${encrypt(req.params.pw)}</strong>
        <form method="post">
            <div class="form-group">
                <label for="cmp">Compare to:</label>
                <input class="form-control" name="cmp" id="cmp"><input type="submit" class="btn btn-default" value="compare">
            </div>
        </form>`
    });
});

router.post('/xpw/:pw', (req, res) => {
    let encrypted = encrypt(req.params.pw);
    res.render('page', {
        data: `<strong>${encrypted}</strong>
        <form method="post">
                <input class="form-control" name="cmp" id="cmp"><input type="submit" class="btn btn-default" value="compare">&rArr; ${bcrypt.compareSync(req.body.cmp, encrypted)}
        </form>`
    });
});*/

router.get('/tac', (req, res) => {
  res.render('page', {
    data: `<h1>Terms and conditions</h1>
    <p>
        In order to use the services provided by this web application ('MENP'), you agree to the following:
        <ol>
            <li>You will not commit any forms of illegal cyber activities such as: bullying, scamming, phishing, stealing, ...</li>
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

router.get('/2fa', (req, res) => {
  res.render('2fa', {
    user: req.user,
    page: '2fa'
  });
});

router.post('/2fa', /*requireLogin,*/ (req, res, next) => {
  User.findById(req.body.id, (err, user) => {
    if (!user) {
      noSuchUser();
      console.log(console.err('No such user with id=', req.body.id));
      return res.redirect('/login');
    }
    if (user.id !== req.body.id) {
      req.flash('error', 'The request originated from a different user. Aborting!');
      return httpPage(550, res);
    }
    if (!user.key) console.log(clr.err(`User ${user.username} doesn't have any key :(`));
    /*
        @todo Make sure the expirancy is right on that (use <= instead?)
         */
    if (req.body.token === user.key && user.keyExpires > Date.now()) {
      req.flash('success', 'Successful Authentication!');
      req.logIn(user, (err) => {
        if (err) return next(err);
        user.lastSeen = new Date();
        user.save((err) => {
          if (err) console.log(clr.err('2FA error'), err);
          req.flash('success', `Welcome "${user.title}. ${user.fname} ${user.lname}"`);
          console.log(clr.inf(`${user.username} <${user.email}> just logged in`));
          return res.redirect(`/usr/${user.id}`);
        });
      });
    } else {
      req.flash('error', 'The code you gave is the wrong one or it expired');
      //console.log(clr.debug('Code given:'), req.body.token, clr.warn('\nCode expected:'), user.key);
      res.redirect('/login');
    }
  });
});

module.exports = router;