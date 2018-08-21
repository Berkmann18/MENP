const router = require('express').Router(),
  flash = require('express-flash');
const { modOnly, noSuchUser, noUsers, requireLogin, _err } = require('./generic');
const { User } = require('../src/model');
const { userTable } = require('../src/utils');

router.use(flash());

/**
 * @description Global moderator page authorisation system.
 */
router.all('/*', modOnly, (req, res, next) => next());

const COLS = ['title', 'fname', 'lname', 'username', 'email', 'password', 'registerDate', 'lastSeen', 'id', 'type'];

/**
 * @description Moderator page.
 * @protected
 */
router.get('/', modOnly, (req, res) => {
  User.find({}, (err, users) => {
    if (err) _err('Error:', err);
    if (!users) return noUsers(req, res);

    let data = `${userTable(users, {
      cols: COLS,
      dir: 'mod'
    })}
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
      </div>`;

    res.render('page', {
      data,
      user: req.user,
      page: 'mod'
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
    if (user.type === 'admin') {
      req.flash('error', 'You cannot remove admins');
      return res.redirect('/mod');
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