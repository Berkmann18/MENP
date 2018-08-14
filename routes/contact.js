const router = require('express').Router(),
  flash = require('express-flash'),
  validator = require('validator'),
  nodemailer = require('nodemailer'),
  sgTransport = require('nodemailer-sendgrid-transport');
const config = require('../config/config');
const { emailError } = require('./generic');

router.use(flash());

let lastTicket = 0;
const genTicket = () => `${(new Date()).getTime()}#${lastTicket++}`;

/**
 * @description 'Contact us' page.
 */
router.get('/', (req, res) => res.render('contact', {
  user: req.user,
  page: 'contact'
}));

/**
 * @description 'Contact us' form handler.
 */
router.post('/', (req, res) => {
  let keepDetails = () => res.render('contact', {
    name: req.body.name,
    email: req.body.email,
    subject: req.body.subject,
    message: req.body.message,
    page: 'contact'
  });

  if (!validator.isEmail(req.body.email)) {
    console.log('wrong email');
    req.flash('error', 'The email isn\'t valid');
    return keepDetails();
  }

  const smtpTransport = nodemailer.createTransport(sgTransport(config.sgOptions)),
    mailOptions = {
      to: config.email.to,
      from: req.body.email,
      subject: `[MENP:Contact] ${req.body.subject}` || '[?] No subject',
      text: `Contact email from "${req.body.name}":\n\n${req.body.message}\n\nTicket number: ${genTicket()}`
    };
  smtpTransport.sendMail(mailOptions, (err) => {
    if (err) {
      emailError(req, err);
      res.redirect('/contact');
    } else {
      console.log('Email sent');
      req.flash('success', 'The email was sent!');
      req.flash('info', 'Thank you for your interest!\nWe will get back to you as soon as possible.')
      res.redirect('/');
    }
  });
});

module.exports = router;