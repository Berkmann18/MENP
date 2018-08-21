const router = require('express').Router(),
  flash = require('express-flash'),
  validator = require('validator');
const { adminOnly, noSuchUser, noUsers, requireLogin, _err, _inf } = require('./generic');
const { User } = require('../src/model');
const { userTable } = require('../src/utils');

router.use(flash());

/**
 * @description Global admin page authorisation system.
 */
router.all('/*', adminOnly, (req, res, next) => next());

const COLS = ['title', 'fname', 'lname', 'username', 'email', 'password', 'registerDate', 'lastSeen', 'id', 'type'];

/**
 * @description Admin page.
 * @protected
 */
router.get('/', adminOnly, (req, res) => {
  User.find({}, (err, users) => {
    if (err) _err('Error:', err);
    if (!users) return noUsers(req, res);
    let data = `${userTable(users, {
      cols: COLS,
      dir: 'admin'
    })}
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
        <form name="usrChange" method="POST" action="/admin/ch">
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
      <form name="usrRemove" method="POST" action="/admin/rm">
            <div class="form-group">
                <label for="id">Id:</label>
                <input name='id' class="form-control" required>
            </div>
            <input type="submit" class="btn btn-danger btn-block" value="Remove">
      </form>
    </div>
    </div>`;
    res.render('page', {
      data,
      user: req.user,
      page: 'admin'
    });
  });
});

/**
 * @description Admin User change page.
 * @protected
 */
router.post('/ch', adminOnly, (req, res, next) => {
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
    user.save((err) => {
      req.flash('success', 'Information updated');
      if (err) {
        req.flash('error', `Change error: ${err.code} ${err.responseCode}`)
        _err('Admin authored change error:', err);
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
    if (err) _err('Error:', err);
    if (!user) {
      noSuchUser(req)(req);
      return res.redirect('back');
    }
    user.remove((err) => {
      if (err) {
        req.flash('error', `Removal error: ${err.code} ${err.responseCode}`)
        _err('Admin authored removal error:', err);
      }
      req.flash('success', 'User successfully deleted!');
      _inf(`${user.username} <${user.email}> got kicked out`);
      return res.redirect('/admin');
    });
    next();
  });
});

/**
 * @description User search page.
 */
router.get('/search', requireLogin, (req, res) => {
  let set = {},
    queryParts = req.query.term.split(' '),
    hasPair = req.query.term.includes('=');

  if (queryParts.length > 1 && hasPair) {
    let $and = queryParts.map(part => {
      let words = part.split('=');
      return {
        [words[0]]: words[1]
      }
    });
    set = { $and }
  } else if (queryParts.length === 1 && hasPair) {
    let parts = req.query.term.split('=');
    set = {
      [parts[0]]: parts[1]
    };
  } else if (req.query.term !== '') {
    let $or = ['title', 'fname', 'lname', 'username', 'email', 'password', 'id', 'type'].map(fld => {
      return {
        [fld]: req.query.term
      }
    });
    set = { $or }
  }

  User.find(set, (err, users) => {
    if (err) _err('Error:', err);
    if (!users) return noUsers(req, res);
    res.render('page', {
      data: userTable(users, {
        cols: COLS,
        dir: 'mod',
        term: req.query.term
      }),
      user: req.user,
      page: 'mod'
    });
  });
});

module.exports = router;