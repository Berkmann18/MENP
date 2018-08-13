const router = require('express').Router(),
  flash = require('express-flash');
const { modOnly, noSuchUser, noUsers, _err } = require('./generic');
const { User } = require('../src/model');

router.use(flash());

/**
 * @description Global moderator page authorisation system.
 */
router.all('/*', modOnly, (req, res, next) => next());

/**
 * @description Moderator page.
 * @protected
 */
router.get('/', modOnly, (req, res) => {
  let cols = ['title', 'fname', 'lname', 'username', 'email', 'password', 'registerDate', 'lastSeen', 'id', 'type'];
  let usrlist = '<table class="table"><caption>Users</caption><tr>',
    nb = 0;
  for (let col of cols) usrlist += `<th>${col}</th>`;
  usrlist += '</tr>';
  User.find({}, (err, users) => {
    if (err) _err('Error:', err);
    if (!users) return noUsers(req, res);
    for (let user of users) {
      usrlist += '<tr>';
      for (let col of cols) usrlist += `<td>${user[col]}</td>`;
      usrlist += '</tr>';
      ++nb;
    }
    usrlist += `</table><p><em>${nb}</em> users</p>
        <ul class="nav nav-pills mb-3" id="pills-tab" role="tablist">
          <li class="nav-item">
            <a class="nav-link" id="pills-remove-tab" data-toggle="pill" href="#pills-remove" role="tab" aria-controls="pills-remove" aria-selected="false">Remove</a>
          </li>
        </ul>
        <div class="tab-content" id="pills-tabContent">
        <div class="tab-pane fade" id="pills-remove" role="tabpanel" aria-labelledby="pills-remove-tab">
          <form name="usrRemove" method="POST" action="/mod/rm/">
                <div class="form-group">
                    <label for="id">Id:</label>
                    <input name='id' class="form-control" required>
                </div>
                <input type="submit" class="btn btn-danger btn-block" value="Remove">
          </form>
        </div>
        </div>
        `;
    res.render('page', {
      data: usrlist,
      user: req.user
    });
  });
});

/**
 * @description Moderator User removal page.
 * @protected
 */
router.post('/rm', modOnly, (req, res, next) => {
  User.findById(req.body.id, (err, user) => {
    if (err) _err('Error:', err);
    if (!user) {
      noSuchUser(req)(req);
      return res.redirect('back');
    }
    user.remove((err) => {
      if (err) {
        req.flash('error', `Removal error: ${err.code} ${err.responseCode}`)
        _err('Moderator authored removal error:', err);
      }
      req.flash('success', 'User successfully deleted!');
      _inf(`${user.username} <${user.email}> got kicked out`);
      return res.redirect('/mod');
    });
    next();
  });
});

module.exports = router;