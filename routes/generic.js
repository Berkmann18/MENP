/* eslint-env es6, node */
/**
 * @description Generic (utility) route.
 * @module generic
 * @exports {load, incomingIp, requireLogin, adminOnly, modOnly, memberOnly, sameUserOnly, codeToMsg, sendSms, httpPage, setColours, clr, noSuchUser,
 * noUsers, emailError, execCaptcha, _in, _out, _inf, _err, _warn, _dbg, welcomeUser}
 */

const config = require('../config/config'),
  Nexmo = require('nexmo'),
  clr = require('colors'),
  fs = require('fs'),
  captcha = require('trek-captcha'),
  path = require('path'),
  _async = require('asyncawait/async'),
  _await = require('asyncawait/await');
const nexmo = new Nexmo(config.nexmoOptions),
  clrScheme = { in: 'white',
    out: 'cyan',
    inf: 'green',
    err: 'red',
    warn: 'yellow',
    debug: 'grey'
  };

/**
 * @description Print an error.
 * @param {...*} data Data to print
 * @private
 */
let _err = (...data) => console.error(clr.err(...data));

/**
 * @description Print an information.
 * @param {...*} data Data to print
 * @private
 */
let _inf = (...data) => {
  try {
    console.info(clr.inf(...data));
  } catch (err) {
    console.log(clr.inf(...data));
  }
};

/**
 * @description Print a  warning.
 * @param {...*} data Data to print
 * @private
 */
let _warn = (...data) => {
  try {
    console.warn(clr.warn(...data));
  } catch (err) {
    console.log(clr.warn(...data));
  }
};

/**
 * @description Print a debug message.
 * @param {...*} data Data to print
 * @private
 */
let _dbg = (...data) => {
  try {
    console.debug(clr.debug(...data));
  } catch (err) {
    console.log(clr.debug(...data));
  }
};

/**
 * @description Print an output.
 * @param {...*} data Data to print
 * @private
 */
let _out = (...data) => console.log(clr.out(...data));
/**
 * @description Print an input.
 * @param {...*} data Data to print
 * @private
 */
let _in = (...data) => console.log(clr.in(...data));

/**
 * @description Set a colour scheme for the CLI.
 * @protected
 */
let setColours = () => clr.setTheme(clrScheme);

/**
 * @description Load an HTML page.
 * @param {Object} res ExpressJS result
 * @param {string} [page='index'] Page name
 * @protected
 */
let load = (res, page = 'index') => res.sendFile(path.join(`${__dirname}/../public/${page}.html`));

/**
 * @description Get the Incoming IP address.
 * @param {Object} req HTTP request
 * @return {?string} IP Address
 * @protected
 */
let incomingIp = (req) => {
  if ('x-forwarded-for' in req.headers) return req.headers['x-forwarded-for'].split(',').pop();
  if ('connection' in req) return req.connection.remoteAddress || req.connection.socket.remoteAddress;
  if ('ip' in req) return req.ip;
  if ('socket' in req) return req.socket.remoteAddress;
  return null; //Should never reach that
};

/**
 * @description Check if a user is logged in before proceeding to the next page or returns to the login one.
 * @param {object} req HTTP request
 * @param {object} res ExpressJS result
 * @param {function} next Function that will execute as the next step
 * @throws {Error} No req
 * @protected
 */
let requireLogin = (req, res, next) => {
  if (!req) throw new Error('requireLogin needs a request to proceed');
  req.user || req.isAuthenticated() ? next() : httpPage(403, res);
};

/**
 * @description Check the user's type.
 * @param {object} req HTTP request
 * @param {string} [type='member'] User type allowed.
 * @return {boolean} Type check passed
 * @protected
 */
let userTypeCheck = (req, type = 'member') => {
  if (!req.user) return false;
  return req.user.type === type || req.user.type === 'admin' || (req.user.type === 'moderator' && type === 'member');
};

/**
 * @description Show a page based on the HTTP code provided.
 * @param {number} code HTTP code
 * @param {object} res ExpressJS result
 * @protected
 */
let httpPage = (code, res) => {
  res.status(code).render('page', {
    data: `${codeToMsg({status: code})}<br><em>Error ${code} on '${res.req.url}'</em><br>
    <a href="/">Go back to the home page</a>&nbsp; &nbsp;
    <a href="/sitemap">Go back to the sitemap</a>`
  });
};

/**
 * @description Check if a user is logged in and is an administrator before going to the next page.
 * @param {object} req HTTP request
 * @param {object} res ExpressJS result
 * @param {function} next Function that will execute as the next step
 * @protected
 */
let adminOnly = (req, res, next) => {
  (req.user && req.user.type === 'admin') ? next(): httpPage(403, res);
};

/**
 * @description Check if a user is logged in and is a moderator before going to the next page.
 * @param {object} req HTTP request
 * @param {object} res ExpressJS result
 * @param {function} next Function that will execute as the next step
 * @protected
 */
let modOnly = (req, res, next) => {
  userTypeCheck(req, 'moderator') ? next() : httpPage(403, res);
};

/**
 * @description Check if a user is logged in and is a member before going to the next page.
 * @param {object} req HTTP request
 * @param {object} res ExpressJS result
 * @param {function} next Function that will execute as the next step
 * @protected
 */
let memberOnly = (req, res, next) => {
  (req.user && ['member', 'moderator', 'admin'].indexOf(req.user.type) > -1) ? next(): httpPage(403, res);
};

/**
 * @description Check if the user logged in is the one that has access to the current route.
 * @param {object} req HTTP request
 * @param {object} res ExpressJS result
 * @param {function} next Function that will execute as the next step
 * @protected
 */
let sameUserOnly = (req, res, next) => {
  req.user && req.user.id === req.params.id ? next() : httpPage(403, res);
};

/**
 * @description Get a message corresponding to an HTTP code.
 * @param {(error|{status:number, message:string=})} err Error
 * @return {string} Message
 * @protected
 */
let codeToMsg = (err) => {
  let map = {
    400: '<h1>Ooh dear!! You asked the wrong thing mate!</h1><img src="/img/400.png" alt="400">',
    401: '<h1>HALT!! You\'re not authorised to be here!!</h1><img src="/img/403.png" alt="401-403">',
    404: '<h1>Whoops!!</h1>The page you requested ran away so can\'t found<br><img src="/img/404.gif" alt="404">',
    410: '<h1>My condolences :(!</h1>The page you wanted, sadly left us!<br><img src="/img/410.jpg" alt="410">',
    500: '<h1>Something went wrong in the server... Apologies :s</h1><img src="/img/500.png" alt="500">',
    501: '<h1>Wow! This wasn\'t implemented, what a shame!</h1><img src="/img/501.jpg" alt="501">',
    503: '<h1>The service in charge went for a nap, please require it later!</h1><img src="/img/503.jpg" alt="503">',
    550: '<h1>What are you doing? You\'re not allowed here!</h1><img src="/img/550.jpg" alt="550">'
  };
  map[403] = map[401];
  return (map[err.status]) ? map[err.status] : err.message;
};

/**
 * @description Send an SMS.
 * @param {string} from Sender's number.
 * @param {string} to Receiver's number.
 * @param {string} text SMS
 * @param {function((object|Error))} callback Callback that will handle either the error or the response data
 * @protected
 */
let sendSms = (from, to, text, callback) => {
  nexmo.message.sendSms(
    from, to, text,
    (err, responseData) => callback(err || responseData)
  );

};

/**
 * @description Error message when no user is found a particular request.
 * @param {object} req HTTP request
 * @protected
 */
let noSuchUser = (req) => req.flash('error', 'No such user');

/**
 * @description Error message and action when no users were found.
 * @param {object} req HTTP request
 * @param {object} res Express result object
 * @protected
 */
let noUsers = (req, res) => {
  req.flash('error', 'No users :(');
  return res.redirect('/');
};

/**
 * @description Welcome message for a user.
 * @param {object} req HTTP request
 * @param {object} user User
 */
let welcomeUser = (req, user) => req.flash('success', `Welcome "${user.title}. ${user.fname} ${user.lname}"`);

/**
 * @description Error while sending an email.
 * @param {object} req HTTP request
 * @param {Error} err Error
 * @protected
 */
let emailError = (req, err) => {
  req.flash('error', `An error occured while sending the email (${err.code} ${err.responseCode})`);
  _err('SMTP error:', err);
};

/**
 * @description Create a captcha.
 * @param {function(File)} callback Callback that handles the token of the captcha
 * @param {string} [gifPath=`${path.dirname(__dirname)}/public/img/ct.gif`] Path of the captcha image that will be generated
 * @return {Promise.<void>} Captcha promise
 * @protected
 */
let execCaptcha = _async((callback, gifPath = `${path.dirname(__dirname)}/public/img/ct.gif`) => {
  const { token, buffer } = _await(captcha());

  fs.createWriteStream(gifPath).on('finish', () => callback(token)).end(buffer)
});

module.exports = {
  load,
  httpPage,
  noSuchUser,
  noUsers,
  emailError,
  codeToMsg,
  sendSms,
  incomingIp,
  requireLogin,
  adminOnly,
  modOnly,
  memberOnly,
  sameUserOnly,
  setColours,
  clr,
  execCaptcha,
  welcomeUser,
  _in,
  _out,
  _inf,
  _err,
  _warn,
  _dbg
};