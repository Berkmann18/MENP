const router = require('express').Router();
const { requireLogin, noSuchUser, httpPage, welcomeUser } = require('./generic');
const { error, info } = require('../src/utils');
const { User } = require('../src/model');

/**
 * @description 2 Factor Authentication form.
 */
router.get('/', requireLogin, (req, res) => {
  res.render('2fa', {
    user: req.user,
    page: '2fa'
  });
});

/**
 * @description 2FA process.
 */
router.post('/', (req, res, next) => {
  User.findById(req.body.id, (err, user) => {
    if (err) error('Error:', err);
    if (!user) {
      noSuchUser(req);
      error('No such user with id=', req.body.id);
      return res.redirect('/login');
    }
    if (user.id !== req.body.id) {
      req.flash('error', 'The request originated from a different user. Aborting!');
      return httpPage(550, res);
    }
    if (!user.key) error(`User ${user.username} doesn't have any key :(`);
    if (req.body.token === user.key && user.keyExpires > Date.now()) {
      req.flash('success', 'Successful Authentication!');
      req.logIn(user, (err) => {
        if (err) return next(err);
        user.lastSeen = new Date();
        user.save((err) => {
          if (err) error('2FA error:', err);
          welcomeUser(req, user);
          info(`${user.username} <${user.email}> just logged in`);
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