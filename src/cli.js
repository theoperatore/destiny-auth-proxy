#!/usr/bin/env node

// the cli is always run in production, unless overridden
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const program = require('commander');
const pkgVersion = require('../package.json').version;
const createServer = require('./server');
const log = require('./utils/logger');

const collect = (value, collection) => {
  collection.push(value);
  return collection;
};

program
  .version(pkgVersion)
  .option('-p, --port [port]', 'Port to run the server on. Defaults to 9966', 9966)
  .option('-c, --client [clientId:clientSecret]', 'Bungie API clientId:clientSecret pairs', collect, [])
  .option('-d, --domain [fqdn]', 'A domain that this proxy will serve.', collect, [])
  .option('-v, --verbose', 'Output log messages to the console')
  .parse(process.argv);

const port = program.port;

const authorizedClients = program.client.reduce((obj, clientPair) => {
  const parts = clientPair.split(':');
  const pair = {
    [parts[0]]: parts[1],
  };

  return Object.assign(obj, pair);
}, {});

const server = createServer(authorizedClients, program.domain);

server.enableFileLogging();
if (program.verbose) {
  server.enableConsoleLogging();
}

server.listen(port, () => {
  log.info(`- ${new Date().toUTCString()} Destiny Auth Proxy listening on: ${port}`);
});
