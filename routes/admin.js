const router = require('express').Router(),
  validator = require('validator');
const { adminOnly, noSuchUser, requireLogin } = require('./generic');
const { User } = require('../src/model');
const { error, info, modminPage } = require('../src/utils');

/**
 * @description Global admin page authorisation system.
 */
router.all('/*', adminOnly, (req, res, next) => next());

const COLS = ['title', 'fname', 'lname', 'username', 'email', 'password', 'registerDate', 'lastSeen', 'id', 'type'];
const admin = true;

/**
 * @description Admin page.
 * @protected
 */
router.get('/', adminOnly, (req, res) => modminPage(req, res, COLS, { admin }));

/**
 * @description Admin User change page.
 * @protected
 */
router.post('/ch', adminOnly, (req, res, next) => {
  User.findById(req.body.id, (err, user) => {
    if (err) error('Error:', err);
    if (!user) {
      noSuchUser(req)(req);
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
    user.save((err) => {
      req.flash('success', 'Information updated');
      if (err) {
        req.flash('error', `Change error: ${err.code} ${err.responseCode}`)
        error('Admin authored change error:', err);
      }
    });
    res.redirect('/admin');
    next(); //This may need to be moved to user.save
  });
});

/**
 * @description Admin User removal page.
 * @protected
 */
router.post('/rm', adminOnly, (req, res, next) => {
  User.findById(req.body.id, (err, user) => {
    if (err) error('Error:', err);
    if (!user) {
      noSuchUser(req)(req);
      return res.redirect('back');
    }
    user.remove((err) => {
      if (err) {
        req.flash('error', `Removal error: ${err.code} ${err.responseCode}`)
        error('Admin authored removal error:', err);
      }
      req.flash('success', 'User successfully deleted!');
      info(`${user.username} <${user.email}> got kicked out`);
      return res.redirect('/admin');
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

  modminPage(req, res, COLS, { admin, filter, term: req.query.term });
});

module.exports = router;