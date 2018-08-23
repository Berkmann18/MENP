const router = require('express').Router();
const { modOnly, noSuchUser, requireLogin } = require('./generic');
const { User } = require('../src/model');
const { error, modminPage } = require('../src/utils');

/**
 * @description Global moderator page authorisation system.
 */
router.all('/*', modOnly, (req, res, next) => next());

const COLS = ['title', 'fname', 'lname', 'username', 'email', 'password', 'registerDate', 'lastSeen', 'id', 'type']

/**
 * @description Moderator page.
 * @protected
 */
router.get('/', modOnly, (req, res) => modminPage(req, res, COLS));

/**
 * @description Moderator User removal page.
 * @protected
 */
router.post('/rm', modOnly, (req, res, next) => {
  User.findById(req.body.id, (err, user) => {
    if (err) error('Error:', err);
    if (!user) {
      noSuchUser(req)(req);
      return res.redirect('back');
    }
    if (user.type === 'admin') {
      req.flash('error', 'You cannot remove admins');
      return res.redirect('/mod');
    }
    user.remove((err) => {
      if (err) {
        req.flash('error', `Removal error: ${err.code} ${err.responseCode}`)
        error('Moderator authored removal error:', err);
      }
      req.flash('success', 'User successfully deleted!');
      _inf(`${user.username} <${user.email}> got kicked out`);
      return res.redirect('/mod');
    });
    next();
  });
});

/**
 * @description User search page.
 */
router.get('/search', requireLogin, (req, res) => {
  let filter = {},
    queryParts = req.query.term.split(' '),
    hasPair = req.query.term.includes('=');

  if (queryParts.length > 1 && hasPair) {
    let $and = queryParts.map(part => {
      let words = part.split('=');
      return {
        [words[0]]: words[1]
      }
    });
    filter = { $and }
  } else if (queryParts.length === 1 && hasPair) {
    let parts = req.query.term.split('=');
    filter = {
      [parts[0]]: parts[1]
    };
  } else if (req.query.term !== '') {
    let $or = ['title', 'fname', 'lname', 'username', 'email', 'password', 'id', 'type'].map(fld => {
      return {
        [fld]: req.query.term
      }
    });
    filter = { $or }
  }

  modminPage(req, res, COLS, { filter, term: req.query.term });
});

module.exports = router;