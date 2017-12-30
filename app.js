/**
 * @description Application module
 * @module app
 * @requires express, path, serve-favicon, cookie-parser, body-parser, morgan
 * @requires ./routes/index
 * @exports app
 */

/* eslint-env es6, node */

let express = require('express'), path = require('path');
let favicon = require('serve-favicon');
let cookieParser = require('cookie-parser'), bodyParser = require('body-parser');
let index = require('./routes/index'), logger = require('morgan'), {httpPage, codeToMsg} = require('./routes/generic');

/**
 * @description Express application
 * @type {*|Function}
 */
let app = express();

/**
 * View engine setup
 */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(path.join(__dirname, 'public/img', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('trust proxy');

app.use('/', index);

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