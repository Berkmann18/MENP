const router = require('express').Router(),
  flash = require('express-flash'),
  validator = require('validator'),
  sgMail = require('@sendgrid/mail');
const config = require('../config/config');
const { emailError } = require('./generic');

if (process.env.SENDGRID_API_KEY === undefined) throw new Error('You need to set the process.env.SENDGRID_API_KEY in order to use this module');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
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

  const msg = {
    to: config.email.to,
    from: req.body.email,
    subject: `[MENP:Contact] ${req.body.subject}` || '[?] No subject',
    text: `Contact email from "${req.body.name}":\n\n${req.body.message}\n\nTicket number: ${genTicket()}`
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log('Email sent');
      req.flash('success', 'The email was sent!');
      req.flash('info', 'Thank you for your interest!\nWe will get back to you as soon as possible.')
      res.redirect('/');
    }, err => {
      emailError(req, err);
      res.redirect('/contact');
    });
});

module.exports = router;