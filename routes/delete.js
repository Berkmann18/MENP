const router = require('express').Router();
const { requireLogin, noSuchUser, httpPage } = require('./generic');
const { error, info } = require('../src/utils');
const { User } = require('../src/model');

/**
 * @description User account deletion page.
 */
router.get('/:id', requireLogin, (req, res) => {
  if (req.user.id === req.params.id) {
    res.render('delete', {
      user: req.user
    });
  } else httpPage(401, res);
});

/**
 * @description User account deletion handler.
 */
router.post('/:id', requireLogin, (req, res) => {
  User.findById(req.user.id, (err, user) => {
    if (err) error('POST deletion error:', err);
    if (!user) {
      noSuchUser(req);
      return res.redirect('/');
    }
    user.remove((err) => {
      if (err) error('User deletion error:', err);
      req.flash('success', 'User successfully deleted!');
      info(`${user.username} <${user.email}> is gone`);
      return res.redirect('/');
    });
  });
});

module.exports = router;