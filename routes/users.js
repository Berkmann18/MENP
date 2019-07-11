const router = require('express').Router();
const { User } = require('../src/model');
const { noUsers, noSuchUser, httpPage, memberOnly, requireLogin } = require('./generic');
const { error, warn, userTable } = require('../src/utils');

const DB_COLS = ['username', 'registerDate', 'lastSeen', 'type'],
  COLS = ['Username', 'Registration date', 'Last seen', 'Type'];

/**
 * @description User page.
 * @param {Request} req HTTP(S) request
 * @param {object} res Result
 * @param {object} filter Filter object
 * @param {string} term Term to input in the input field
 */
const userPage = (req, res, filter = {}, term = '') => {
  User.find(filter, (err, users) => {
    if (err) error('Error:', err);
    if (!users) return noUsers(req, res);

    res.render('page', {
      data: userTable(users, {
        cols: DB_COLS,
        visualCols: COLS,
        term
      }),
      user: req.user,
      page: 'users'
    });
  });
}

/**
 * @description Members list.
 * @protected
 */
router.get('/', memberOnly, (req, res) => userPage(req, res));

/**
 * @description User page where a user can see a user's page.
 */
router.get('/@:username', requireLogin, (req, res) => {
  User.findOne({ username: req.params.username }, (err, visitedUser) => {
    if (err) error('User page error:', err);
    if (!visitedUser) {
      warn('No user with username:', req.params.username);
      noSuchUser(req);
      httpPage(404, res);
    } else res.render('user', { visitedUser, user: req.user });
  });
});

/**
 * @description User search page.
 */
router.get('/search', requireLogin, (req, res) => {
  let set = {};
  const inGroup = /(type)=\w+/gi.test(req.query.term),
    inName = /(username)=\w+/gi.test(req.query.term);

  if (inGroup && inName) {
    let parts = req.query.term.split(' '); //['username=...', 'type=...']
    let $and = parts.map(part => {
      let words = part.split('=');
      return {
        [words[0]]: words[1]
      }
    }); //[ { username: '...' }, { type: '...' } ]
    set = { $and }
  } else if (inGroup) set = { type: req.query.term.split('=')[1] }
  else if (inName) set = { username: req.query.term.split('=')[1] }
  else if (req.query.term !== '') {
    set = {
      $or: [
        { type: req.query.term },
        { username: req.query.term }
      ]
    }
  }

  userPage(req, res, set, req.query.term);
});

module.exports = router;