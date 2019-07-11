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
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser');
const logger = require('morgan');
const { setRoutes, setEnv } = require('./src/utils'), { setApp } = require('./src/security');

/**
 * @description Express application
 * @type {*|Function}
 */
const app = express();

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

setApp(app);

setRoutes(app, {
  '/': 'index',
  '/admin': 'admin',
  '/mod': 'moderator',
  '/usr': 'usr',
  '/users': 'users',
  '/contact': 'contact',
  '/register': 'register',
  '/login': 'login',
  '/forgot': 'forgot',
  '/reset': 'reset',
  '/2fa': 'twofa',
  '/delete': 'delete',
  '/about': 'about',
  '/tac': 'tac'
});

setEnv(app, process.argv[2]);

module.exports = app;