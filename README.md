# Destiny Auth Proxy

A simple server to help with refreshing tokens so your users can stop having to keep logging into Bungie to get access to your awesome app!

This flow is for those Bungie applications that are using the `Confidential OAuth Client Type`. See the [Bungie OAuth Documentation](https://github.com/Bungie-net/api/wiki/OAuth-Documentation) for more info.

This simple auth proxy server supports many domains and many clientId/clientSecret pairs; as many separate Bungie applications as you want!

### How it works

When your app starts up try to get a token from the auth proxy: 

```https://<destiny-auth-proxy-domain>/token?clientId=<clientId>```

This will either return an auth token and membership id to use, or it will respond with `401 Unauthorized`. 

If you are unauthorized, redirect the user to Bungie's authorization endpoint:

```https://www.bungie.net/en/oauth/authorize?client_id=CLIENT_ID&response_type=code```.

Once you get your code, use that to try to get another token from the auth proxy:

```https://<destiny-auth-proxy-domain>/token?clientId=<clientId>&code=<authCodeFromBungie>```

By sending the `authCodeFromBungie` and the `clientId`, the auth proxy can obtain an auth token and `refresh_token` and send them to you. At the same time, the proxy sets a cookie to help with the next time you want to authenticate (without having to redirect to Bungie's authorization endpoint).

On subsequent refreshes to your application, the auth proxy should be able to return a newly refreshed token by reading the cookie that was set during the last successful OAuth attempt.

Be sure that any `401` from the auth proxy is handled by redirecting to Bungie to get another `authCode`.

### Requirements

|engine|version|
|------|-------|
|node|`10.14.2`|

Easiest way to get that version is to use [nvm](https://github.com/creationix/nvm). Once that's installed it's just:

```bash
nvm install
```

and it'll pick up the correct node version.

### SSL Requirement

Because Bungie's authorization callback endponts require `https` (they won't let you do `http`), this proxy needs to be run using an ssl certificate.

The best way to specify where you `cert` and `key` are is using the environment variables: `DESTINY_AUTH_PROXY_CERT_PATH` and `DESTINY_AUTH_PROXY_KEY_PATH`. Set those to the **absolute path** of your key and certficate files and the server will pick them up.

The server and cli are set up to use [dotenv](https://github.com/motdotla/dotenv). For easy environment variable configuring, make a `.env` file and put:

```
DESTINY_AUTH_PROXY_CERT_PATH=Absolute/Path/To/Cert
DESTINY_AUTH_PROXY_KEY_PATH=Absolute/Path/To/Key
```

And run your proxy.

#### Developing locally

Since using https is a hard requirement, obtaining a license to develop locally is kind of a pain, but doable.

1. [Follow these directions from Let's Encrypt to generate your cert](https://letsencrypt.org/docs/certificates-for-localhost/)
2. Get your OS to always trust that certificate you just generated. On MacOS, that's in **Keychain Access**.
3. Set `DESTINY_AUTH_PROXY_CERT_PATH` and `DESTINY_AUTH_PROXY_KEY_PATH` to the absolute paths of the cert and key you just created and trusted.

If you don't want to do this yourself, then [these cert generator scripts](https://github.com/dakshshah96/local-cert-generator/) seem good.

### Installation

There are two main ways to use the server; `cli` or `nodejs`.

#### Nodejs Installation

```bash
# or npm install
yarn add @theoperatore/destiny-auth-proxy
```

#### Nodejs usage

```js
// your server.js file or whatever...
const createServer = require('@theoperatore/destiny-auth-proxy');
const port = process.env.PORT || 1337;

const clientId = process.env.BUNGIE_CLIENT_ID;
const clientSecret = process.env.BUNGIE_CLIENT_SECRET,

const authorizedClients = {
  [clientId]: clientSecret,
};

const authorizedDomains = [
  'https://my-destiny-app.com',
];

const app = createServer(authorizedClients, authorizedDomains);
const server = app.listen(port, () => console.log('server up at:', port));
```

#### cli installation

```bash
# npm install -g
yarn global add @theoperatore/destiny-auth-proxy
```

This will install the `destiny-auth-proxy` executable

#### cli basic usage

```bash
# client and domain can be used multiple times
destiny-auth-proxy --client=<clientId:clientSecret> --domain="https://my-desinty-app.com" --port=<port>

# for complete info
destiny-auth-proxy --help
```

### Logging

By default, both ways to use the server will output logs to `console.log` and `console.error`. In the future, it'll be likely that [winston]() is used, but for getting started, might as well use use the console :)

### License

MIT
