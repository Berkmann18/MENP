/* eslint-env es6, node */

let path = require('path'),
  extend = require('util')._extend;

let development = require('./env/development'),
  production = require('./env/production');

let defaults = {
  root: path.normalize(`${__dirname}/..`),
  tokenCooldown: 36e5, //1h in ms
  esig: 'Best regards,\nMENP team\n'
};

module.exports = {
  name: 'MENP',
  development: extend(development, defaults),
  production: extend(production, defaults)
}[process.env.NODE_ENV || 'development'];