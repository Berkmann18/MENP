/* eslint-env es6, node */

const RateLimit = require('express-rate-limit'),
  helmet = require('helmet'),
  uuid = require('uuid');

const limiter = new RateLimit({
    windowMs: 15 * 6e3, //15 minutes
    max: 100, //Limit each IP to 100 requests per windowMs
    delayMs: 0 //Disable delaying - full speed until the max limit is reached
  }),
  OneYear = 31536e3;;

/**
 * @description Set the security of the application.
 * @param {(Express|function(req:Object, res:Object))} app Routing application
 */
const setApp = (app) => {
  app.use((req, res, next) => {
    res.locals.nonce = uuid.v4();
    next()
  });

  app.use(helmet({
    frameguard: { action: 'deny' }, //No I-frame uses
  }));
  app.use(helmet.xssFilter());
  app.use(helmet.contentSecurityPolicy({
    directives: require('./csp.json'),
    browserSniff: false,
    reportOnly: (req, res) => req.query.cspmode === 'debug',
    loose: false
  }));
  app.use(helmet.hsts({
    maxAge: OneYear,
    includeSubDomains: true,
    preload: true
  }));
  app.use(limiter);

  // If CSURF is present put this route above the csurf middleware
  app.post('/report-violation', (req, res) => {
    console.log('CSP Violation: ', (req.body || 'No data received!'));
    res.status(204).end()
  });
};

module.exports = { setApp }