#!/usr/bin/env node
/* eslint-env es6, node */
'use strict';

const fs = require('fs'), http = require('http'), https = require('https'), app = require('../app'),
  eip = require('external-ip')();
const {setColours, _inf, _err} = require('../routes/generic');
const tlsOptions = {
  key: fs.readFileSync('keys/server-key.pem'),
  cert: fs.readFileSync('keys/server-cert.pem')
};

setColours();

/**
 * Normalize a port into a number, string, or false.
 * @param {(string|number)} val Port
 * @return {(string|number|boolean)} Port
 */
let normalizePort = (val) => {
  let port = parseInt(val, 10);

  if (isNaN(port)) return val; //Named pipe
  if (port >= 0) return port; //Port number
  return false;
};

/**
 * @description Server error handler.
 * @param {Error} error Error
 */
let onErr = (error) => {
  if (error.syscall !== 'listen') throw error;
  let bind = (typeof port === 'string') ? `Pipe ${port}` : `Port ${port}`;
  //Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    case 'ENOENT':
      console.log(`Nonexistent entry requested at ${bind}`);
      break;
    default:
      throw error;
  }
};

let port = normalizePort(process.env.PORT || 3e3), uPort = normalizePort(process.env.UNSECURE_PORT || 3001);

/**
 * @description Start a server.
 * @param {(string|number)} port Port/pipe
 * @param {boolean} secure Is this server using an HTTPS connection
 * @return {any} Server
 */
let startServer = (port, secure = false) => {
  let www = secure ? https.createServer(tlsOptions, app) : http.createServer(app);
  www.listen(port, () => {
    app.set('port', port);
    app.set('protocol', secure ? 'https' : 'http');
    console.log(app.get('hostname'));
    if (app.get('browser') || process.env.BROWSER) {
      require('browser-sync')({
        proxy: `localhost:${port}`,
        files: ['public/**/*.{js,css}']
      });
    }
    let ipAddress = www.address();
    // :: is the reduced form of the unspecified IPv6 address 0:0:0:0:0:0:0:0
    let location = typeof ipAddress === 'string'
      ? `pipe ${ipAddress}`
      : `http${secure ? 's' : ''}://${ipAddress.address === '::' ? 'localhost' : ipAddress.address}:${ipAddress.port}`;

    console.log(`${secure ? '' : 'Insecure '}Server listening at ${location}`);
  });
  www.on('error', onErr);
  return www;
};

startServer(port, true);
startServer(uPort);

eip((err, ip) => {
  if (err) _err('Public IP error:', err);
  _inf('Public IP:', ip);
});