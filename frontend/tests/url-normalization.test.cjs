const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = { URL, console, localStorage: { getItem: () => null }, window: {}, document: { addEventListener() {} } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../js/api.js'), 'utf8') + ';globalThis.testAPI = API;', context);
const API = context.testAPI;
const full = 'https://www.flipkart.com/lenovo-100e-chromebook-gen-4-mediatek-kompanio-520-8-gb-64-gb-emmc-storage-chrome-os/p/itm338cfd61c4d4e?pid=COMHC5G9YPVUM34V&lid=LSTCOMHC5G9YPVUM34VCWFWGC&marketplace=FLIPKART&store=6bo%2Fb5g&srno=b_1_7&otracker=browse&fm=organic&iid=b8b07019-73c0-47e3-b367-c6143b7b7215.COMHC5G9YPVUM34V.SEARCH&ppt=None&ppn=None&ssid=al8saw18k00000001792080913326&ov_redirect=true';
const canonical = full.split('&', 1)[0];
test('full Flipkart URLs lose tracking and retain the variant PID', () => {
  assert.equal(API.normalizeProductUrl(full), canonical);
});
test('HTML and Markdown ampersands from copied links are accepted', () => {
  for (const value of [full.replaceAll('&', '&amp;'), full.replaceAll('&', '\\&'), ' ' + full + ' ']) {
    assert.equal(API.normalizeProductUrl(value), canonical);
  }
});
test('short-link token case remains unchanged', () => {
  const short = 'https://dl.flipkart.com/s/D7zDBQuuuN';
  assert.equal(API.normalizeProductUrl(short), short);
});
test('review links resolve to the same product identity', () => {
  assert.equal(API.normalizeProductUrl(full.replace('/p/', '/product-reviews/')), canonical);
});
test('the shared API used by both forms sends a normalized URL', async () => {
  let payload;
  API._fetch = async (_, options) => { payload = JSON.parse(options.body); return { success: true }; };
  await API.products.analyze(full);
  assert.equal(payload.url, canonical);
});
