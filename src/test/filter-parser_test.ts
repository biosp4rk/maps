import { FilterParser, FilterType } from '../filter-parser.js';

import { assert } from '@open-wc/testing';

suite('filter-parser', () => {
  test('parses a single term and lowercases it', () => {
    const items = FilterParser.parse('Health');
    assert.equal(items.length, 1);
    assert.equal(items[0].type, FilterType.Term);
    assert.equal(items[0].term, 'health');
    assert.isFalse(items[0].exclude);
  });

  test('parses multiple space-separated terms', () => {
    const items = FilterParser.parse('foo bar');
    assert.deepEqual(items.map(i => i.term), ['foo', 'bar']);
    assert.deepEqual(items.map(i => i.type), [FilterType.Term, FilterType.Term]);
  });

  test('parses an exclusion term', () => {
    const items = FilterParser.parse('-foo');
    assert.equal(items[0].type, FilterType.Term);
    assert.equal(items[0].term, 'foo');
    assert.isTrue(items[0].exclude);
  });

  test('parses a regex and compiles it case-insensitively', () => {
    const items = FilterParser.parse('/ab.c/');
    assert.equal(items[0].type, FilterType.Regex);
    assert.instanceOf(items[0].regex, RegExp);
    assert.isTrue(items[0].regex!.test('ABXC'));
  });

  test('handles an escaped slash inside a regex', () => {
    const items = FilterParser.parse('/a\\/b/');
    assert.equal(items.length, 1);
    assert.equal(items[0].type, FilterType.Regex);
    assert.isTrue(items[0].regex!.test('a/b'));
  });

  test('drops an unterminated regex', () => {
    assert.equal(FilterParser.parse('/abc').length, 0);
  });

  test('parses every address operator', () => {
    const cases: [string, FilterType][] = [
      ['=100', FilterType.AddrEQ],
      ['==100', FilterType.AddrEQ],
      ['>100', FilterType.AddrGT],
      ['>=100', FilterType.AddrGE],
      ['<100', FilterType.AddrLT],
      ['<=100', FilterType.AddrLE],
      ['~100', FilterType.AddrNear],
    ];
    for (const [text, type] of cases) {
      const items = FilterParser.parse(text);
      assert.equal(items.length, 1, text);
      assert.equal(items[0].type, type, text);
      assert.equal(items[0].addr, 0x100, text);
    }
  });

  test('subtracts the ROM offset from virtual addresses', () => {
    const items = FilterParser.parse('=8000100');
    assert.equal(items[0].addr, 0x100);
  });

  test('drops an address filter with invalid hex', () => {
    assert.equal(FilterParser.parse('=xyz').length, 0);
  });
});
