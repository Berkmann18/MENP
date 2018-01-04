#!/usr/bin/env node
/* eslint-env es6, node */

const fs = require('fs'), http = require('http'), https = require('https'), app = require('../app'), eip = require('externalip');
const tlsOptions = {
  key: fs.readFileSync('keys/server-key.pem'),
  cert: fs.readFileSync('keys/server-cert.pem')
};

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

let port = normalizePort(process.env.PORT || 3e3), uPort = normalizePort(process.env.UNSECURE_PORT || 3001);

//let server = app.listen(port, () => {
let server = https.createServer(tlsOptions, app).listen(port, () => {
  let ipAddress = server.address();
  // :: is the reduced form of the unspecified IPv6 address 0:0:0:0:0:0:0:0
  let location = typeof ipAddress === 'string'
    ? `pipe ${ipAddress}`
    : `https://${ipAddress.address === '::' ? 'localhost' : ipAddress.address}:${ipAddress.port}`;

  console.log('Server listening at', location);
}), unsecureServer = http.createServer(app).listen(uPort, () => {
  let ipAddress = unsecureServer.address();
  let location = typeof ipAddress === 'string'
    ? `pipe ${ipAddress}`
    : `http://${ipAddress.address === '::' ? 'localhost' : ipAddress.address}:${ipAddress.port}`;

  console.log('Unsecure server listening at', location);
});

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

server.on('error', onErr);
unsecureServer.on('error', onErr);

eip((err, ip) => {
  if (err) console.log('Public IP error:', err);
  console.log('Public IP:', ip);
});