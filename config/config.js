/* eslint-env es6, node */

// const path = require('path');
const name = process.env.SERVICE || 'MENP';

let defaults = {
  // root: path.normalize(`${__dirname}/..`),
  name,
  tokenCooldown: 36e5, //1h in ms
  esig: 'Best regards,\nMENP team\n',
  urlWhiteList: ['https://localhost', 'http://localhost'],
  sgOptions: {
    auth: {
      api_key: process.env.SG_KEY
    }
  },
  nexmoOptions: {
    apiKey: process.env.NEXMO_KEY,
    apiSecret: process.env.NEXMO_SECRET,
    from: name
  },
  db: process.env.DB
};

  if (process.env.NODE_ENV === 'production') defaults.db += '_prod'

module.exports = defaults;