import {
  VarEntry, DataEntry, StructVarEntry, EnumEntry
} from '../info-entry.js';
import { TypeSpecKind } from '../asset-type.js';

import { assert } from '@open-wc/testing';

suite('info-entry', () => {
  suite('VarEntry sizes', () => {
    test('built-in int is 4 bytes', () => {
      const v = new VarEntry({ type: 'int' });
      assert.isFalse(v.isPtr);
      assert.equal(v.getSize({}), 4);
      assert.equal(v.getLength({}), 4);
    });

    test('long is 8 bytes', () => {
      assert.equal(new VarEntry({ type: 'long' }).getSize({}), 8);
    });

    test('a pointer is 4 bytes regardless of pointee', () => {
      const v = new VarEntry({ type: 'struct Foo *' });
      assert.isTrue(v.isPtr);
      assert.equal(v.getSize({}), 4);
    });

    test('array length multiplies element size by count', () => {
      const v = new VarEntry({ type: 'int', count: '0x10' });
      assert.equal(v.getCount(), 16);
      assert.equal(v.getLength({}), 16 * 4);
    });

    test('struct size is read from the sizes map', () => {
      const v = new VarEntry({ type: 'struct Foo' });
      assert.equal(v.specKind, TypeSpecKind.Struct);
      assert.equal(v.specName(), 'Foo');
      assert.equal(v.getSize({ Foo: 0x20 }), 0x20);
    });
  });

  suite('typeStr', () => {
    test('renders a plain type unchanged', () => {
      assert.equal(new VarEntry({ type: 'int' }).typeStr(), 'int');
    });

    test('appends a hex array dimension', () => {
      assert.equal(new VarEntry({ type: 'int', count: '0x10' }).typeStr(), 'int [0x10]');
    });
  });

  suite('sortValue', () => {
    test('DataEntry sorts by address', () => {
      const e = new DataEntry({ name: 'x', type: 'int', addr: '0x100', loc: '' });
      assert.equal(e.sortValue(), 0x100);
    });

    test('StructVarEntry sorts by offset', () => {
      const e = new StructVarEntry({ name: 'x', type: 'int', offset: '0x8' });
      assert.equal(e.sortValue(), 8);
    });
  });

  suite('EnumEntry', () => {
    test('parses values and their numeric sort keys', () => {
      const e = new EnumEntry({
        name: 'E', loc: '',
        vals: [{ name: 'A', val: '0x0' }, { name: 'B', val: '0x1' }],
      });
      assert.equal(e.vals.length, 2);
      assert.equal(e.vals[1].val, 1);
      assert.equal(e.vals[1].sortValue(), 1);
    });
  });
});
