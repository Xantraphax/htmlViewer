import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isLocalFile} from '../js/tabs.js';
test('lokale Dateiverweise erkennen',()=>{
  assert.equal(isLocalFile('styles.css','styles.css'),true);
  assert.equal(isLocalFile('./styles.css?v=1','styles.css'),true);
  assert.equal(isLocalFile('script.js#v2','script.js'),true);
  assert.equal(isLocalFile('https://example.org/styles.css','styles.css'),false);
  assert.equal(isLocalFile('other.css','styles.css'),false);
});
