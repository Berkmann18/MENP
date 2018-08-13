const router = require('express').Router();
const { User } = require('../src/model');
const { noUsers, noSuchUser, _err, _warn, httpPage, memberOnly, requireLogin } = require('./generic');

/**
 * @description Members list.
 * @protected
 */
router.get('/', memberOnly, (req, res) => {
  let cols = ['username', 'registerDate', 'lastSeen', 'type'],
    visualCols = ['Username', 'Registration date', 'Last seen', 'Group'];
  let usrlist = '<table class="table"><caption>Users</caption><tr>',
    nb = 0;
  for (let col of visualCols) usrlist += `<th>${col}</th>`;
  usrlist += '</tr>';
  User.find({}, (err, users) => {
    if (err) _err('Error:', err);
    if (!users) return noUsers(req, res);
    for (let user of users) {
      usrlist += '<tr>';
      for (let col of cols) {
        if (col === 'username') usrlist += `<td><a href="/users/@${user[col]}">${user[col]}</a></td>`
        else if (col === 'type') usrlist += `<td><span class="${user[col]}">${user[col]}</span<</td>`;
        else usrlist += `<td>${user[col]}</td>`;
      }
      usrlist += '</tr>';
      ++nb;
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

module.exports = router;