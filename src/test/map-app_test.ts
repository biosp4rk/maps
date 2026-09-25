import { MapApp } from '../map-app.js';

import { assert } from '@open-wc/testing';

suite('map-app', () => {
  test('is defined', () => {
    const el = document.createElement('map-app');
    assert.instanceOf(el, MapApp);
  });

});
