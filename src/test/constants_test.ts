import {
  getMainTableType, tableHasAddr, getHeading, getHideableColumns, TableType,
  MAP_RAM, MAP_CODE, MAP_STRUCTS, MAP_ENUMS, MAP_TYPEDEFS,
  KEY_ADDR, KEY_NAME, KEY_LEN, KEY_CAT, KEY_TYPE, KEY_DESC
} from '../constants.js';

import { assert } from '@open-wc/testing';

suite('constants', () => {
  suite('getMainTableType', () => {
    test('maps known map names to table types', () => {
      assert.equal(getMainTableType(MAP_RAM), TableType.RamList);
      assert.equal(getMainTableType(MAP_CODE), TableType.CodeList);
      assert.equal(getMainTableType(MAP_STRUCTS), TableType.StructList);
      assert.equal(getMainTableType(MAP_ENUMS), TableType.EnumList);
      assert.equal(getMainTableType(MAP_TYPEDEFS), TableType.TypedefList);
    });

    test('returns None for an unknown map name', () => {
      assert.equal(getMainTableType('bogus'), TableType.None);
    });
  });

  suite('tableHasAddr', () => {
    test('true for ram/code/data lists', () => {
      assert.isTrue(tableHasAddr(TableType.RamList));
      assert.isTrue(tableHasAddr(TableType.CodeList));
      assert.isTrue(tableHasAddr(TableType.DataList));
    });

    test('false for definition lists and None', () => {
      assert.isFalse(tableHasAddr(TableType.StructList));
      assert.isFalse(tableHasAddr(TableType.EnumList));
      assert.isFalse(tableHasAddr(TableType.None));
    });
  });

  suite('getHeading', () => {
    test('returns the display heading for a key', () => {
      assert.equal(getHeading(KEY_ADDR), 'Address');
      assert.equal(getHeading(KEY_NAME), 'Name');
    });
  });

  suite('getHideableColumns', () => {
    test('returns the hideable columns for a ram list', () => {
      const keys = getHideableColumns(TableType.RamList).map(c => c.key);
      assert.deepEqual(keys, [KEY_LEN, KEY_CAT, KEY_TYPE, KEY_DESC]);
    });

    test('returns an empty list for types without hideable columns', () => {
      assert.deepEqual(getHideableColumns(TableType.StructDef), []);
      assert.deepEqual(getHideableColumns(TableType.None), []);
    });
  });
});
