/* eslint-env es6, node */

let path = require('path');

/* eslint-disable node/no-unpublished-require */
let development = require('./env/development'),
  production = require('./env/production');
/* eslint-enable node/no-unpublished-require */

let defaults = {
  root: path.normalize(`${__dirname}/..`),
  tokenCooldown: 36e5, //1h in ms
  esig: 'Best regards,\nMENP team\n'
};

module.exports = {
  name: 'MENP',
  development: Object.assign(development, defaults),
  production: Object.assign(production, defaults)
}[process.env.NODE_ENV || 'development'];