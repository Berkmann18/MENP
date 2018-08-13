const router = require('express').Router(),
  flash = require('express-flash'),
  validator = require('validator');
const { noSuchUser, sameUserOnly, _err } = require('./generic');
const { User } = require('../src/model');

router.use(flash());

/**
 * @description User page where a user can see his/her informations.
 */
router.get('/:id', sameUserOnly, (req, res) => {
  User.findById(req.params.id, (err, user) => {
    if (err) _err('Error:', err);
    if (!user) {
      _err('No user with id:', req.params.id);
      noSuchUser(req);
      return res.redirect('/');
    }
    console.log('user=', user);
    res.render('user', {
      user,
      visitedUser: user,
      same: true
    });
  });
});

/**
 * @description User page where a user can update his/her informations.
 */
router.get('/:id/edit', sameUserOnly, (req, res) => {
  User.findById(req.params.id, (err, user) => {
    if (err) _err('Error:', err);
    if (!user) {
      _err('No user with id', req.params.id);
      noSuchUser(req);
      return res.redirect('/');
    }
    console.log('2FA method:', user.twoFaMethod);
    res.render('update', { user });
  });
});

/**
 * @description User account update form handler.
 */
router.post('/:id/edit', (req, res) => {
  User.findById(req.params.id, (err, user) => {
    if (err) _err('Error:', err);
    if (!user) {
      noSuchUser(req);
      return res.redirect('/');
    }
    let keepDetails = () => {
        return res.render('update', {
          user: {
            title: req.body.title,
            type: req.body.type,
            fname: req.body.fname,
            lname: req.body.lname,
            username: req.body.username,
            email: req.body.email,
            id: req.params.id,
            twoFA: req.body.twoFA,
            phone: req.body.phone
          }
        });
      },
      updateDetail = (field) => user[field] = req.params[field] || req.body[field] || user[field];

    if (!validator.isEmail(req.body.email)) {
      req.flash('error', 'The email address isn\'t valid');
      keepDetails();
    }
    if (req.body.password.length < 8) req.flash('warning', 'The password is too weak.\nPlease make sure it\'s 8+ characters long');
    if (req.body.confirm !== req.body.password) {
      req.flash('error', 'The confirmation password must be identical to the password');
      keepDetails();
    }

    updateDetail('title');
    updateDetail('fname');
    updateDetail('lname');
    updateDetail('username');
    updateDetail('email');
    updateDetail('password');
    updateDetail('twoFA');
    updateDetail('phone');

    user.save((err) => {
      if (err) {
        _err('Update error:', err);
        req.flash('error', `There was an error in the information update (error ${err.statusCode})`);
      } else {
        res.render('update', { user });
        req.flash('success', 'Information updated');
      }
    });

  });
});

module.exports = router;