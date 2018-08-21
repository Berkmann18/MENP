const router = require('express').Router();
const { User } = require('../src/model');
const { noUsers, noSuchUser, _err, _warn, httpPage, memberOnly, requireLogin } = require('./generic');
const { dateDiff } = require('../src/utils');

/**
 * @description Make a table with informations of users.
 * @param {User[]} users List of users
 * @param {?Object} [filter=null] Filter criteria
 * @returns {string} HTML code of the table
 */
const userTable = (users, filter = null) => {
  let cols = ['username', 'registerDate', 'lastSeen', 'type'],
    visualCols = ['Username', 'Registration date', 'Last seen', 'Type'],
    usrlist = '<table class="table"><caption>Users</caption><tr>',
    nb = 0;
  for (let col of visualCols) usrlist += `<th>${col}</th>`;
  usrlist += '</tr>';
  for (let user of users) {
    if (filter && !Object.values(user).includes(filter.term)) console.log('skipping', user);
    usrlist += '<tr>';
    for (let col of cols) {
      if (col === 'username') usrlist += `<td><a href="/users/@${user[col]}">${user[col]}</a></td>`
      else if (col === 'type') usrlist += `<td><span class="${user[col]}">${user[col]}</span<</td>`;
      else if (col === 'registerDate') {
        let diff = dateDiff('w', user[col], Date.now());
        usrlist += (diff < 1.5) ? `<td><span class="newmember">${user[col]}</span</td>` : `<td>${user[col]}</td>`;
      } else usrlist += `<td>${user[col]}</td>`;
    }
    usrlist += '</tr>';
    ++nb;
  }
  usrlist += `</table><p><em>${nb}</em> users (as of ${new Date()})</p>`;
  return usrlist;
}



/**
 * @description Members list.
 * @protected
 */
router.get('/', memberOnly, (req, res) => {

  let searchBar = `
  <form action="/users/search" method="get">
    <div class="input-group stylish-input-group">
      <input type="text" class="form-control" placeholder="Search" name="term">
      <span class="input-group-addon">
        <button type="submit">
          <span class="fas fa-search"></span>
        </button>  
      </span>
    </div>
  </form>`;

  User.find({}, (err, users) => {
    if (err) _err('Error:', err);
    if (!users) return noUsers(req, res);
    res.render('page', {
      data: `${searchBar}${userTable(users)}`,
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


router.get('/search', requireLogin, (req, res) => {
  let searchBar = `
  <form action="/users/search" method="get">
    <div class="input-group stylish-input-group">
      <input type="text" class="form-control" placeholder="Search" name="term" value="${req.query.term}">
      <span class="input-group-addon">
        <button type="submit">
          <span class="fas fa-search"></span>
        </button>  
      </span>
    </div>
  </form>`;

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
  } else if (inGroup) {
    set = { type: req.query.term.split('=')[1] }
  } else if (inName) {
    set = { username: req.query.term.split('=')[1] }
  } else if (req.query.term !== '') {
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
      data: `${searchBar}${userTable(users)}`,
      user: req.user,
      page: 'users'
    });
  });
});

module.exports = router;