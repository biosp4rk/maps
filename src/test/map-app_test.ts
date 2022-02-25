/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { MapApp } from '../map-app.js';

import { assert } from '@open-wc/testing';

suite('map-app', () => {
  test('is defined', () => {
    const el = document.createElement('map-app');
    assert.instanceOf(el, MapApp);
  });

});
