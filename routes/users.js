const router = require('express').Router();
const { User } = require('../src/model');
const { noUsers, noSuchUser, _err, _warn, httpPage, memberOnly, requireLogin } = require('./generic');
const { dateDiff, userTable } = require('../src/utils');

const DB_COLS = ['username', 'registerDate', 'lastSeen', 'type'],
  COLS = ['Username', 'Registration date', 'Last seen', 'Type'];

/**
 * @description Members list.
 * @protected
 */
router.get('/', memberOnly, (req, res) => {
  User.find({}, (err, users) => {
    if (err) _err('Error:', err);
    if (!users) return noUsers(req, res);
    res.render('page', {
      data: userTable(users, {
        cols: DB_COLS,
        visualCols: COLS
      }),
      user: req.user,
      page: 'users'
    });
  });
});

/**
 * @description User page where a user can see a user's page.
 */
router.get('/@:username', requireLogin, (req, res) => {
  User.findOne({ username: req.params.username }, (err, visitedUser) => {
    if (err) _err('User page error:', err);
    if (!visitedUser) {
      _warn('No user with username:', req.params.username);
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
  const GRP_RE = /(type)=\w+/gi,
    USR_RE = /(username)=\w+/gi;

  let inGroup = GRP_RE.test(req.query.term),
    inName = USR_RE.test(req.query.term);

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

  User.find(set, (err, users) => {
    if (err) _err('Error:', err);
    if (!users) return noUsers(req, res);
    res.render('page', {
      data: userTable(users, {
        cols: DB_COLS,
        visualCols: COLS,
        term: req.query.term
      }),
      user: req.user,
      page: 'users'
    });
  });
});

module.exports = router;