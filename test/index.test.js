let request = require('supertest');
const app = require('../app');
const { info } = require('../src/utils');

request = request(app);

const PLAIN = 'text/plain; charset=utf-8',
  HTML = 'text/html; charset=utf-8',
  ID = '5a46cc8dc8d2f93ee0016c11',
  TIMEOUT = 9e3;
const OK = 200,
  FOUND = 302,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERV_ERROR = 500;

let count = 0;
const up = () => ++count,
  dn = () => --count;

/**
 * @description Global expectation test function.
 * @param {function} done Async end function
 * @param {Request} req HTTP request
 * @param {number} [status=OK] HTTP status
 * @param {string} [contentType=HTML] Content type
 * @return {*} Expectations
 */
const globalExpect = (done, req, status = OK, contentType = HTML) => {
  up();
  return req.expect('Content-Type', contentType)
    .expect(status)
    .expect('Access-Control-Allow-Origin', 'https://localhost,http://localhost')
    .expect('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    .expect('X-Content-Type-Options', 'nosniff')
    .expect('X-DNS-Prefetch-Control', 'off')
    .expect('X-Download-Options', 'noopen')
    .expect('X-Frame-Options', 'DENY')
    .expect('X-RateLimit-Limit', '100')
    .expect('X-XSS-Protection', '1; mode=block')
    .end((err) => {
      dn();
      if (err) info(err);
      info(`Count: ${count}`);
      done();
    });
};

/**
 * @description GET behavioural test.
 * @param {string} route Route to get
 * @param {number} [status=OK] HTTP status
 * @param {string} [contentType=HTML] Content type
 */
const get = (route, status = OK, contentType = HTML) => {
  describe(`GET ${route}`, () => {
    it('respond', (done) => {
      globalExpect(done, request.get(route), status, contentType);
    });
  });
};

/**
 * @description POST behavioural test.
 * @param {string} route Route to get
 * @param {number} [status=OK] HTTP status
 * @param {string} [contentType=HTML] Content type
 * @param {*} data Data to send
 * @param {number} [maxTime=2e3] Max timeout
 */
const post = (route, status = OK, contentType = HTML, data, maxTime = 2e3) => {
  describe(`POST ${route}`, () => {
    it('respond', (done) => {
      let r = request.post(route);
      if (data) r.send(data);
      globalExpect(done, r, status, contentType);
    }).timeout(maxTime);
  });
};

['', 'about', 'contact', 'sitemap', 'login', 'register', 'forgot', 'tac'].forEach(route => get(`/${route}`));
['logout'].forEach(route => get(`/${route}`, FOUND, PLAIN));
['reset', 'usr'].forEach(route => get(`/${route}`, NOT_FOUND));
['admin', 'admin/ch', 'users', 'usr/:id', `usr/${ID}`, 'usr/:id/edit', `usr/${ID}/edit`, 'delete/:id', `delete/${ID}`, 'users/@user', 'users/@maxie', '2fa']
.forEach(route => get(`/${route}`, FORBIDDEN));

['contact' /* , 'register' */ ].forEach(route => {
  try {
    post(`/${route}`, INTERNAL_SERV_ERROR, HTML, {}, TIMEOUT);
  } catch (err) {
    if (err instanceof TypeError) console.log(`Type error caught on /${route}`);
    else console.log(`Unexpected error on /${route}`);
  }
});

['login', 'forgot', 'reset/:token'].forEach(route => post(`/${route}`, FOUND, PLAIN));

[ /* `usr/${ID.substr(5)}/edit`,  */ `usr/${ID}/edit`].forEach(route => {
  try {
    post(`/${route}`, FORBIDDEN);
  } catch (err) {
    if (err instanceof CastError) console.log(`Cast error caught on /${route}`);
    if (err instanceof TypeError) console.log(`Type error caught on /${route}`);
    else console.log(`Unexpected error on /${route}`);
  }
});

// ['2fa'].forEach(route => post(`/${route}`, FOUND, PLAIN));

try {
  const data = {
    name: 'Name',
    email: 'e@mail.co',
    subject: 'Test',
    message: '... from index.test.js'
  };
  post('/contact', FOUND, PLAIN, data, TIMEOUT);
} catch (err) {
  if (err instanceof TypeError) console.log('Type error caught on /contact');
  else console.log('Unexpected error on /contact');
}

try {
  const data = {
    title: '',
    fname: '',
    lname: '',
    username: '',
    password: '',
    email: '',
    twoFA: '',
    twoFaMethod: '',
    phone: '',
    page: '',
    captcha: ''
  };
  post('/register', OK, HTML, data, TIMEOUT);
} catch (err) {
  if (err instanceof TypeError) console.log('Type error caught on /register');
  else console.log('Unexpected error on /register');
}

app.listen().close(); //@andretf on https://github.com/mochajs/mocha/issues/3044