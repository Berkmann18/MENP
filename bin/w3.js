/* eslint-env es6, node */
'use strict';

const fs = require('fs'),
  Server = require('serverbuilder'),
  path = require('path');
const app = require('../app'),
  { setColours } = require('../src/utils');
const securityOptions = {
  key: fs.readFileSync('keys/server-key.pem'),
  cert: fs.readFileSync('keys/server-cert.pem')
};
require('dotenv').config(path.resolve(process.cwd(), '../.env'));
setColours();

/**
 * @description Callback for the server.
 * @param {Server} server ServerBuilder instance
 * @param {object} cfg Server configuration
 */
const serverCallback = (server, cfg) => {
  server.app.set('port', cfg.port);
  server.app.set('protocol', cfg.opts.useHttps ? 'https' : 'http');
};

let config = {
  secure: {
    port: process.env.PORT || 3e3, //@todo add to .env
    opts: {
      name: 'Secure Server',
      useHttps: true,
      securityOptions,
      callback(server) {
        serverCallback(server, config.secure)
      }
    },
  },
  normal: {
    port: process.env.UNSECURE_PORT || 3001, //@todo add to .env
    opts: {
      name: 'Unsecure Server',
      callback(server) {
        serverCallback(server, config.normal)
      }
    }
  }
}

let servers = [
  new Server(app, config.secure.port, config.secure.opts),
  new Server(app, config.normal.port, config.normal.opts)
];