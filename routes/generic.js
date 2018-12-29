/* eslint-env es6, node */
/**
 * @description Generic (utility) route.
 * @module generic
 * @exports {load, incomingIp, requireLogin, adminOnly, modOnly, memberOnly, sameUserOnly, sendSms, httpPage, noSuchUser,
 * noUsers, emailError, execCaptcha, welcomeUser}
 */

const config = require('../config/config'),
  Nexmo = require('nexmo'),
  fs = require('fs'),
  captcha = require('trek-captcha'),
  path = require('path');
const nexmo = new Nexmo(config.nexmoOptions);
const { error, codeToMsg } = require('../src/utils');

/**
 * @description Load an HTML page.
 * @param {Object} res ExpressJS result
 * @param {string} [page='index'] Page name
 * @protected
 */
const load = (res, page = 'index') => res.sendFile(path.join(`${__dirname}/../public/${page}.html`));

/**
 * @description Get the Incoming IP address.
 * @param {Object} req HTTP request
 * @return {?string} IP Address
 * @protected
 */
const incomingIp = (req) => {
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
const requireLogin = (req, res, next) => {
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
const userTypeCheck = (req, type = 'member') => {
  if (!req.user) return false;
  return req.user.type === type || req.user.type === 'admin' || (req.user.type === 'moderator' && type === 'member');
};

/**
 * @description Show a page based on the HTTP code provided.
 * @param {number} code HTTP code
 * @param {object} res ExpressJS result
 * @protected
 */
const httpPage = (code, res) => {
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
const adminOnly = (req, res, next) => {
  (req.user && req.user.type === 'admin') ? next(): httpPage(403, res);
};

/**
 * @description Check if a user is logged in and is a moderator before going to the next page.
 * @param {object} req HTTP request
 * @param {object} res ExpressJS result
 * @param {function} next Function that will execute as the next step
 * @protected
 */
const modOnly = (req, res, next) => {
  userTypeCheck(req, 'moderator') ? next() : httpPage(403, res);
};

/**
 * @description Check if a user is logged in and is a member before going to the next page.
 * @param {object} req HTTP request
 * @param {object} res ExpressJS result
 * @param {function} next Function that will execute as the next step
 * @protected
 */
const memberOnly = (req, res, next) => {
  (req.user && ['member', 'moderator', 'admin'].indexOf(req.user.type) > -1) ? next(): httpPage(403, res);
};

/**
 * @description Check if the user logged in is the one that has access to the current route.
 * @param {object} req HTTP request
 * @param {object} res ExpressJS result
 * @param {function} next Function that will execute as the next step
 * @protected
 */
const sameUserOnly = (req, res, next) => {
  req.user && req.user.id === req.params.id ? next() : httpPage(403, res);
};

/**
 * @description Send an SMS.
 * @param {string} from Sender's number.
 * @param {string} to Receiver's number.
 * @param {string} text SMS
 * @param {function((object|Error))} callback Callback that will handle either the error or the response data
 * @protected
 */
const sendSms = (from, to, text, callback) => {
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
const noSuchUser = (req) => req.flash('error', 'No such user');

/**
 * @description Error message and action when no users were found.
 * @param {object} req HTTP request
 * @param {object} res Express result object
 * @protected
 */
const noUsers = (req, res) => {
  req.flash('error', 'No users :(');
  return res.redirect('/');
};

/**
 * @description Welcome message for a user.
 * @param {object} req HTTP request
 * @param {object} user User
 */
const welcomeUser = (req, user) => req.flash('success', `Welcome "${user.title}. ${user.fname} ${user.lname}"`);

/**
 * @description Error while sending an email.
 * @param {object} req HTTP request
 * @param {Error} err Error
 * @protected
 */
const emailError = (req, err) => {
  req.flash('error', `An error occured while sending the email (${err.code} ${err.responseCode})`);
  error('SMTP error:', err);
};

/**
 * @description Create a captcha.
 * @param {function(File)} callback Callback that handles the token of the captcha
 * @param {string} [gifPath=`${path.dirname(__dirname)}/public/img/ct.gif`] Path of the captcha image that will be generated
 * @return {Promise.<void>} Captcha promise
 * @protected
 */
const execCaptcha = async(callback, gifPath = `${path.dirname(__dirname)}/public/img/ct.gif`) => {
  const { token, buffer } = await captcha();

  fs.createWriteStream(gifPath).on('finish', () => callback(token)).end(buffer)
};

module.exports = {
  load,
  httpPage,
  noSuchUser,
  noUsers,
  emailError,
  sendSms,
  incomingIp,
  requireLogin,
  adminOnly,
  modOnly,
  memberOnly,
  sameUserOnly,
  execCaptcha,
  welcomeUser
};