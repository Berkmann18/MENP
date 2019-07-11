const generic = require('./generic');
const { User } = require('../src/model');
const { error, info } = require('../src/utils');

const TYPES = ['admin', 'mod', 'member'];

/**
 * @description User removal page.
 * @protected
 */
const removeUsr = (type, router) => {
  if (!TYPES.includes(type)) throw new TypeError(`${type} is an invalid type`)

  return router.post('/rm', generic[`${type}Only`], (req, res, next) => {
    User.findById(req.body.id, (err, user) => {
      if (err) error('Error:', err);
      if (!user) {
        generic.noSuchUser(req)(req);
        return res.redirect('back')
      }
      if (type === 'mod' && user.type === 'admin') {
        req.flash('error', 'You cannot remove admins');
        return res.redirect('/mod')
      }
      user.remove((err) => {
        if (err) {
          req.flash('error', `Removal error: ${err.code} ${err.responseCode}`);
          error(`${type} authored removal error:`, err);
        }
        req.flash('success', 'User successfully deleted!');
        info(`${user.username} <${user.email}> got kicked out`);
        return res.redirect(`/${type}`)
      });
      next()
    })
  })
};

module.exports = {
  removeUsr
}