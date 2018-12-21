const nock = require('nock');
const supertest = require('supertest');
const createServer = require('./server');

const authorizedClents = {
  abc: '123',
};

afterAll(() => {
  nock.restore();
  nock.cleanAll();
});

test('Client pairs are required', () => {
  expect(() => createServer()).toThrow(
    'AuthorizedClients must have at least one client id/secret pair: { clientId: clientSecret, ... }',
  );
});

test('It fails when trying from unauthorized domain', done => {
  const { app } = createServer(authorizedClents, ['http://authorized.com']);
  supertest(app)
    .get('/health_check')
    .set('Origin', 'http://not-gonna-work.com')
    .expect(500)
    .end(done);
});

test('Listening creates a server', done => {
  const app = createServer(authorizedClents);
  const server = app.listen(1337);

  expect(server).toBeDefined();
  server.close(done);
});

test('GET /health_check endpoint returns 204', done => {
  const { app } = createServer(authorizedClents, ['http://test.test.com']);
  supertest(app)
    .get('/health_check')
    .set('Origin', 'http://test.test.com')
    .expect(204)
    .end(done);
});

test('GET /token returns 400 when no clientid is sent', done => {
  const { app } = createServer(authorizedClents, ['http://test.test.com']);
  supertest(app)
    .get('/token')
    .set('Origin', 'http://test.test.com')
    .expect(400)
    .end(done);
});

test('GET /token returns 401 when unauthorized clientid is sent', done => {
  const { app } = createServer(authorizedClents, ['http://test.test.com']);
  supertest(app)
    .get('/token')
    .query({ clientId: 'not-gonna-work' })
    .set('Origin', 'http://test.test.com')
    .expect(401)
    .end(done);
});

test('GET /token returns 401 with authorized clientid but no code or cookie', done => {
  const { app } = createServer(authorizedClents, ['http://test.test.com']);
  supertest(app)
    .get('/token')
    .query({ clientId: 'abc' })
    .set('Origin', 'http://test.test.com')
    .expect(401)
    .end(done);
});

test('GET /token returns 401 when invalid response from bungie', done => {
  const { app } = createServer(authorizedClents, ['http://test.test.com']);

  nock('https://www.bungie.net')
    .post('/platform/app/oauth/token/', { grant_type: 'authorization_code', code: 'myCode' })
    .once()
    .reply(500, { error_code: 403, error_message: 'no good' });

  supertest(app)
    .get('/token')
    .query({ clientId: 'abc', code: 'myCode' })
    .set('Origin', 'http://test.test.com')
    .expect(401, JSON.stringify({ error_code: 403, error_message: 'no good' }))
    .end(done);
});

test('GET /token with code returns 200 with token, membership_id, and cookie', done => {
  const mockToken = 'access-test-token';
  const mockMembershipId = 123456;
  const mockRefreshToken = 'refresh-test-token';
  const { app } = createServer(authorizedClents, ['http://test.test.com']);

  nock('https://www.bungie.net')
    .post('/platform/app/oauth/token/', { grant_type: 'authorization_code', code: 'myCode' })
    .once()
    .reply(200, {
      refresh_expires_in: 75000,
      refresh_token: mockRefreshToken,
      access_token: mockToken,
      membership_id: mockMembershipId,
    });

  supertest(app)
    .get('/token')
    .query({ clientId: 'abc', code: 'myCode' })
    .set('Origin', 'http://test.test.com')
    .expect(200, { token: mockToken, membershipId: mockMembershipId })
    .expect('set-cookie', /dap_dc/)
    .end(done);
});

test('GET /token with cookie returns 401 when bad response from bungie', done => {
  const copiedCookie = 'dap_dc=s%3Arefresh-test-token.jhRG81mRkuLwnzkkou7Qkl9aZZqUM0aXn2Qk3xlvG28;';
  const mockRefreshToken = 'refresh-test-token';
  const { app } = createServer(authorizedClents, ['http://test.test.com']);

  nock('https://www.bungie.net')
    .post('/platform/app/oauth/token/', { grant_type: 'refresh_token', refresh_token: mockRefreshToken })
    .once()
    .reply(500, { it: 'is broken' });

  supertest(app)
    .get('/token')
    .query({ clientId: 'abc' })
    .set('Cookie', copiedCookie)
    .set('Origin', 'http://test.test.com')
    .expect(401, JSON.stringify({ it: 'is broken' }))
    .end(done);
});

test('GET /token with cookie returns 200 with token, membership_id, and cookie', done => {
  const copiedCookie = 'dap_dc=s%3Arefresh-test-token.jhRG81mRkuLwnzkkou7Qkl9aZZqUM0aXn2Qk3xlvG28;';
  const mockRefreshToken = 'refresh-test-token';
  const mockToken = 'access-test-token';
  const mockMembershipId = 'test-membership-id';
  const { app } = createServer(authorizedClents, ['http://test.test.com']);

  nock('https://www.bungie.net')
    .post('/platform/app/oauth/token/', { grant_type: 'refresh_token', refresh_token: mockRefreshToken })
    .once()
    .reply(200, {
      refresh_expires_in: 75000,
      refresh_token: mockRefreshToken,
      access_token: mockToken,
      membership_id: mockMembershipId,
    });

  supertest(app)
    .get('/token')
    .query({ clientId: 'abc' })
    .set('Cookie', copiedCookie)
    .set('Origin', 'http://test.test.com')
    .expect(200, JSON.stringify({ token: mockToken, membershipId: mockMembershipId }))
    .expect('set-cookie', /dap_dc/)
    .end(done);
});
