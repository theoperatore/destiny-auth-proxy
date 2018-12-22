require('dotenv').config();

const https = require('https');
const fs = require('fs');
const path = require('path');
const request = require('request');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const json = require('body-parser').json;
const morgan = require('morgan');
const logger = require('./utils/logger');

function createServer(authorizedClients, authorizedDomains = []) {
  if (!authorizedClients || Object.keys(authorizedClients).length === 0) {
    throw new Error('AuthorizedClients must have at least one client id/secret pair: { clientId: clientSecret, ... }');
  }

  const origin = (origin, callback) => {
    if (authorizedDomains.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin (${origin}) not in authorizedDomains`));
    }
  };

  const app = express();

  const logFormat =
    ':remote-addr :date[web] :method :url HTTP/:http-version :status :res[content-length] :response-time ms';
  app.use(morgan(logFormat, { stream: logger.stream }));
  app.use(helmet());
  app.use(cors({ origin, credentials: true }));
  app.use(compression());
  app.use(json());
  app.use(cookieParser('dap_dc'));

  app.get('/health_check', (req, res) => {
    res.sendStatus(204);
  });

  app.get('/token', (req, res) => {
    const { code, clientId } = req.query;

    if (!clientId) {
      res.status(400).send('Missing clientId');
      return;
    }

    const clientSecret = authorizedClients[clientId];

    if (!clientSecret) {
      res.status(401).send('Unauthorized clientId');
      return;
    }

    // use this in either method of auth
    const authorization = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    // try to use the refresh token if the cookie exists.
    // otherwise try to use the code.
    const { dap_dc: dapDC } = req.signedCookies;

    if (dapDC) {
      // try to get a token via refresh
      request(
        {
          method: 'POST',
          uri: 'https://www.bungie.net/platform/app/oauth/token/',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${authorization}`,
          },
          form: {
            grant_type: 'refresh_token',
            refresh_token: dapDC,
          },
        },
        (error, response, body) => {
          if (error || response.statusCode !== 200) {
            res.status(401).send(body);
            return;
          }

          const parsed = JSON.parse(body);
          const cookieOptions = {
            httpOnly: true,
            signed: true,
            secure: true,
            maxAge: parsed.refresh_expires_in,
            path: '/',
            domain: req.hostname,
          };

          res.cookie('dap_dc', parsed.refresh_token, cookieOptions);

          res.status(200).send({ token: parsed.access_token, membershipId: parsed.membership_id });
        },
      );
      return;
    }

    if (code) {
      // try to get token via the auth code
      request(
        {
          method: 'POST',
          uri: 'https://www.bungie.net/platform/app/oauth/token/',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${authorization}`,
          },
          form: {
            grant_type: 'authorization_code',
            code,
          },
        },
        (error, response, body) => {
          if (error || response.statusCode !== 200) {
            res.status(401).send(body);
            return;
          }

          const parsed = JSON.parse(body);
          const cookieOptions = {
            httpOnly: true,
            signed: true,
            secure: true,
            maxAge: parsed.refresh_expires_in,
            path: '/',
            domain: req.hostname,
          };

          res.cookie('dap_dc', parsed.refresh_token, cookieOptions);
          res.status(200).send({ token: parsed.access_token, membershipId: parsed.membership_id });
        },
      );
      return;
    }

    // if you got here, you're unauthorized and need to start
    // the flow over;
    res.status(401).send('Unauthorized');
  });

  return {
    listen(port, cb) {
      const sslOptions = {
        key: fs.readFileSync(path.resolve(process.env.DESTINY_AUTH_PROXY_KEY_PATH)),
        cert: fs.readFileSync(path.resolve(process.env.DESTINY_AUTH_PROXY_CERT_PATH)),
      };
      return https.createServer(sslOptions, app).listen(port, cb);
    },
    app,
  };
}

module.exports = createServer;
