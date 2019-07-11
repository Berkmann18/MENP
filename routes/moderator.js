const router = require('express').Router();
const { modOnly, requireLogin } = require('./generic');
const { modminPage } = require('../src/utils');

/**
 * @description Global moderator page authorisation system.
 */
router.all('/*', modOnly, (req, res, next) => next());
//@todo Perhaps remove the redundant (?) modOnly calls in subsequent routes

const COLS = ['title', 'fname', 'lname', 'username', 'email', 'password', 'registerDate', 'lastSeen', 'id', 'type']

/**
 * @description Moderator page.
 * @protected
 */
router.get('/', modOnly, (req, res) => modminPage(req, res, COLS));

require('./super').removeUsr('mod', router);

/**
 * @description User search page.
 */
router.get('/search', requireLogin, (req, res) => {
  let filter = {},
    queryParts = req.query.term.split(' '),
    hasPair = req.query.term.includes('=');

  if (queryParts.length > 1 && hasPair) {
    let $and = queryParts.map(part => {
      let words = part.split('=');
      return {
        [words[0]]: words[1]
      }
    });
    filter = { $and }
  } else if (queryParts.length === 1 && hasPair) {
    let parts = req.query.term.split('=');
    filter = {
      [parts[0]]: parts[1]
    };
  } else if (req.query.term !== '') {
    let $or = ['title', 'fname', 'lname', 'username', 'email', 'password', 'id', 'type'].map(fld => {
      return {
        [fld]: req.query.term
      }
    });
    filter = { $or }
  }

  modminPage(req, res, COLS, { filter, term: req.query.term });
});

module.exports = router;