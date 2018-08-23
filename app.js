/* eslint-env es6, node */
/**
 * @description Application module
 * @module app
 * @requires express, path, serve-favicon, cookie-parser, body-parser, morgan
 * @requires ./routes/index, ./routes/admin, ./routes/user
 * @exports app
 */

const express = require('express'),
  path = require('path'),
  favicon = require('serve-favicon'),
  RateLimit = require('express-rate-limit'),
  helmet = require('helmet'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser');
const index = require('./routes/index'),
  admin = require('./routes/admin'),
  mod = require('./routes/moderator'),
  usr = require('./routes/usr'),
  users = require('./routes/users'),
  contact = require('./routes/contact'),
  register = require('./routes/register'),
  login = require('./routes/login'),
  forgot = require('./routes/forgot'),
  reset = require('./routes/reset'),
  twofa = require('./routes/twofa'),
  remove = require('./routes/delete'),
  logger = require('morgan');
const { httpPage } = require('./routes/generic');
const { codeToMsg } = require('./src/utils');
const limiter = new RateLimit({
    windowMs: 15 * 6e3, //15 minutes
    max: 100, //Limit each IP to 100 requests per windowMs
    delayMs: 0 //Disable delaying - full speed until the max limit is reached
  }),
  OneYear = 31536e3;

/**
 * @description Express application
 * @type {*|Function}
 */
const app = express(),
  uuid = require('uuid');

/**
 * View engine setup
 */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(path.join(__dirname, 'public/img', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json({
  type: ['json', 'application/csp-report']
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('trust proxy');

app.use((req, res, next) => {
  res.locals.nonce = uuid.v4();
  next()
});

app.use(helmet({
  frameguard: { action: 'deny' }, //No I-frame uses
}));
app.use(helmet.xssFilter());
app.use(helmet.contentSecurityPolicy({
  directives: require('./src/csp.json'),
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

app.use('/', index);
app.use('/admin', admin);
app.use('/usr', usr);
app.use('/users', users);
app.use('/contact', contact);
app.use('/mod', mod);
app.use('/register', register);
app.use('/login', login);
app.use('/forgot', forgot);
app.use('/reset', reset);
app.use('/2fa', twofa);
app.use('/delete', remove);

/**
 * @description Environment
 * @type {*|string}
 */
let env = process.argv[2] || process.env.NODE_ENV || 'development';

switch (env) {
case 'development':
  console.log('Development mode');
  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
  break;
case 'production':
  console.log('Production mode');
  app.use((req, res) => { //404
    httpPage(404, res);
  });
  app.use((err, req, res, next) => { //500
    res.status(err.status || 500);
    let msg = codeToMsg(err);
    res.render('page', {
      data: `${msg}<br><em>Error ${err.status} on ${err.path}</em>`
    });
  });
  break;
default:
  console.log(`Unknown mode: ${env}`);
}

module.exports = app;