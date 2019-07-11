const browser = require('webdriverio'),
  assert = require('assert');

describe('Index', () => {
  it('should have the right title', () => {
    browser.url('http://localhost');
    let title = browser.getTitle();
    assert.equal(title, 'MENP');
  });
});