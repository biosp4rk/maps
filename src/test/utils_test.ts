import { toHex } from '../utils.js';

import { assert } from '@open-wc/testing';

suite('utils', () => {
  suite('toHex', () => {
    test('converts to uppercase hex without a prefix', () => {
      assert.equal(toHex(255), 'FF');
      assert.equal(toHex(16), '10');
      assert.equal(toHex(0), '0');
      assert.equal(toHex(0xabc), 'ABC');
    });
  });
});
