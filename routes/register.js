const router = require('express').Router(),
  validator = require('validator'),
  nodemailer = require('nodemailer'),
  sgTransport = require('nodemailer-sendgrid-transport'),
  cheerio = require('cheerio'),
  $ = cheerio.load('<body>...</body>'),
  cors = require('cors');
const { _err, _inf, execCaptcha, emailError } = require('./generic');
const { User } = require('../src/model');
const config = require('../config/config');

const corsOptionsDelegate = (req, callback) => {
  let corsOptions = { origin: (config.urlWhiteList.indexOf(req.header('Origin')) !== -1) };
  //Reflect (enable) the requested origin in the CORS response or disable CORS for this request
  callback(null, corsOptions) //Callback expects two parameters: error and options
}

router.options('/', cors());
/**
 * @description Registration page.
 */
router.get('/', cors(corsOptionsDelegate), (req, res) => {
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
router.post('/', (req, res) => {
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
    if (/\s+/g.test(req.body.username)) {
      req.flash('error', 'The username cannot contain any spaces');
      wrongs = true;
    }
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
          html: `Hello <em>${user.title} ${user.fname} "${user.username}" ${user.lname}</em>,<br><br>Welcome to MENP! I hope you'll enjoy using our application.<br><br>Best regards,<br>MENP Team`
        };
      smtpTransport.sendMail(mailOptions, (err) => {
        if (err) emailError(req, err);
      });
    });
  }).catch(err => _err(err));
});

module.exports = router;