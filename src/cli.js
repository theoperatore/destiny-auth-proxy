#!/usr/bin/env node

const program = require('commander');
const pkgVersion = require('../package.json').version;
const createServer = require('./server');

const collect = (value, collection) => {
  collection.push(value);
  return collection;
};

program
  .version(pkgVersion)
  .option('-p, --port [port]', 'Port to run the server on. Defaults to 9966')
  .option('-c, --client [clientId:clientSecret]', 'Bungie API clientId:clientSecret pairs', collect, [])
  .option('-d, --domain [fqdn]', 'A domain that this proxy will serve.', collect, [])
  .parse(process.argv);

const port = program.port || 9966;

const authorizedClients = program.client.reduce((obj, clientPair) => {
  const parts = clientPair.split(':');
  const pair = {
    [parts[0]]: parts[1],
  };

  return Object.assign(obj, pair);
}, {});

createServer(authorizedClients, program.domain).listen(port, () => {
  console.log(`Destiny Auth Proxy running on port: ${port}`);
});
