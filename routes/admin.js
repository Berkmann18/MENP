const router = require('express').Router(),
  flash = require('express-flash'),
  validator = require('validator');
const { adminOnly, noSuchUser, noUsers, _err } = require('./generic');
const { User } = require('../src/model');

router.use(flash());

/**
 * @description Global admin page authorisation system.
 */
router.all('/*', adminOnly, (req, res, next) => next());

/**
 * @description Admin page.
 * @protected
 */
router.get('/', adminOnly, (req, res) => {
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
            <a class="nav-link active" id="pills-edit-tab" data-toggle="pill" href="#pills-edit" role="tab" aria-controls="pills-edit" aria-selected="true">Edit</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" id="pills-remove-tab" data-toggle="pill" href="#pills-remove" role="tab" aria-controls="pills-remove" aria-selected="false">Remove</a>
          </li>
        </ul>
        <div class="tab-content" id="pills-tabContent">
        <div class="tab-pane fade show active" id="pills-edit" role="tabpanel" aria-labelledby="pills-edit-tab">
            <form name="usrChange" method="POST" action="/admin/ch/">
                <div class="form-group">
                    <label for="id">Id:</label>
                    <input name='id' class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="fname">First name:</label>
                    <input name='fname' class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="lname">Last name:</label>
                    <input name='lname' class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="username">Username:</label>
                    <input name='username' class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input name='email' type="email" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="type">Type:</label>
                    <input name='type' class="form-control" required value="member">
                </div>
                <input type="submit" class="btn btn-success btn-block" value="Update">
                <input type="reset" class="btn btn-default btn-block" value="Reset">
            </form>
        </div>
        <div class="tab-pane fade" id="pills-remove" role="tabpanel" aria-labelledby="pills-remove-tab">
          <form name="usrRemove" method="POST" action="/admin/rm/">
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
 * @description Admin User change page.
 * @protected
 */
router.get('/ch', adminOnly, (req, res, next) => {
  User.findById(req.body.id, (err, user) => {
    if (err) _err('Error:', err);
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
    req.flash('success', 'Information updated');
    user.save((err) => {
      if (err) _err('Admin authored change error:', err);
    });
    next(); //This may need to be moved to user.save
  });
});

module.exports = router;