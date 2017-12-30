/**
 * @description Application module
 * @module app
 * @requires express, path, serve-favicon, cookie-parser, body-parser, morgan
 * @requires ./routes/index
 * @exports app
 */

/* eslint-env es6, node */

const express = require('express'), path = require('path');
const favicon = require('serve-favicon'), RateLimit = require('express-rate-limit'), helmet = require('helmet');
const cookieParser = require('cookie-parser'), bodyParser = require('body-parser');
const index = require('./routes/index'), logger = require('morgan'), {httpPage, codeToMsg} = require('./routes/generic');
const limiter = new RateLimit({
  windowMs: 15 * 6e3, //15 minutes
  max: 100, //Limit each IP to 100 requests per windowMs
  delayMs: 0 //Disable delaying - full speed until the max limit is reached
});

/**
 * @description Express application
 * @type {*|Function}
 */
const app = express(), uuid = require('node-uuid');

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
  frameguard: {action: 'deny'}, //No I-frame uses
}));
app.use(helmet.xssFilter());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ['\'self\'', 'github.com', 'Berkmann18.github.io', 'https://maxcdn.bootstrapcdn.com'],
    styleSrc: ['\'self\'', 'maxcdn.bootstrapcdn.com', 'gitcdn.github.io', '\'unsafe-inline\''],
    scriptSrc: ['\'self\'', 'maxcdn.bootstrapcdn.com', 'code.jquery.com', 'cdnjs.cloudflare.com', 'gitcdn.github.io', '\'unsafe-eval\'', '\'unsafe-inline\'',
      'sha384-alpBpkh1PFOepccYVYDB4do5UnbKysX5WZXm3XxPqe5iKTfUKjNkCk9SaVuEZflJ', 'sha384-vFJXuSJphROIrBnz7yo7oB41mKfc8JzQZiCq4NCceLEaO4IHwicKwpJf9c9IpFgh',
      'sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN', 'sha256-C/MMeoQHEyhrrD8wEB7zDbcJTaUUbPn+oab7cS5qSiI=',
      'sha256-sj3OU5N34uU881eHoZRZhkIOsT4H+v7D6TiEEQnP6U8=',
      (req, res) => `'nonce-${res.locals.nonce}'`  // 'nonce-614d9122-d5b0-4760-aecf-3a5d17cf0ac9'
    ],
    reportUri: '/report-violation',
    fontSrc: ['\'self\'', 'maxcdn.bootstrapcdn.com', 'https://maxcdn.bootstrapcdn.com/'],
    sandbox: ['allow-forms', 'allow-scripts']
  },
  browserSniff: false,
  reportOnly: (req, res) => req.query.cspmode === 'debug',
  loose: false
}));
app.use(limiter);
/*app.disable('x-powered-by')*/
/*app.use(router.csrf()); //Cross-Site Request Forgery protection
app.use((req, res, next) => {
  res.locals.csrftoken = req.session._csrf;
  next();
});
*/
app.use('/', index);

// If CSURF is present put this route above the csurf middleware
app.post('/report-violation', (req, res) => {
  console.log('CSP Violation: ', (req.body || 'No data received!'));
  res.status(204).end()
});

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
    console.log('status:', req.status);
    httpPage(404, res);
  });
  app.use((err, req, res, next) => { //500
    res.status(err.status || 500);
    console.log(`Error status: ${err.status}`);
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