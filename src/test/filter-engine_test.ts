import { FilterEngine } from '../filter-engine.js';
import type { FilterContext } from '../filter-engine.js';
import { FilterParser } from '../filter-parser.js';
import { DataEntry, StructEntry, EnumEntry } from '../info-entry.js';
import { TableType } from '../constants.js';

import { assert } from '@open-wc/testing';

function ctx(over: Partial<FilterContext> = {}): FilterContext {
  return {
    tableType: TableType.RamList,
    structs: {},
    unions: {},
    enums: {},
    sizes: {},
    searchStructsUnions: false,
    searchEnums: false,
    ...over,
  };
}

// int entries are 4 bytes, so `addr` + 4 is the end of each entry
const data = (name: string, addr: string) =>
  new DataEntry({ name, type: 'int', addr, loc: '' });

function run(context: FilterContext, entries: DataEntry[], filter: string): string[] {
  const result = new FilterEngine(context).apply(entries, FilterParser.parse(filter));
  return result.map(e => e.name);
}

suite('filter-engine', () => {
  suite('name filters', () => {
    const entries = [data('health', '0x100'), data('score', '0x104')];

    test('matches by name substring', () => {
      assert.deepEqual(run(ctx(), entries, 'health'), ['health']);
    });

    test('excludes with a leading minus', () => {
      assert.deepEqual(run(ctx(), entries, '-health'), ['score']);
    });

    test('matches by regex', () => {
      assert.deepEqual(run(ctx(), entries, '/sc/'), ['score']);
    });
  });

  suite('address filters', () => {
    const entries = [data('a', '0x100'), data('b', '0x104')];

    test('equality', () => {
      assert.deepEqual(run(ctx(), entries, '=104'), ['b']);
    });

    test('greater than', () => {
      assert.deepEqual(run(ctx(), entries, '>100'), ['b']);
    });

    test('less than or equal', () => {
      assert.deepEqual(run(ctx(), entries, '<=100'), ['a']);
    });

    test('address filter on a non-address table returns nothing', () => {
      assert.deepEqual(run(ctx({ tableType: TableType.StructList }), entries, '=100'), []);
    });
  });

  suite('near-address (binary search)', () => {
    const three = [data('a', '0x100'), data('b', '0x200'), data('c', '0x300')];

    test('target inside a gap returns the bracketing entries', () => {
      assert.deepEqual(run(ctx(), three, '~150'), ['a', 'b']);
    });

    test('target inside an entry returns it with its neighbors', () => {
      assert.deepEqual(run(ctx(), three, '~201'), ['a', 'b', 'c']);
    });

    test('target before the first entry', () => {
      assert.deepEqual(run(ctx(), three, '~50'), ['a']);
    });

    test('target after the last entry', () => {
      assert.deepEqual(run(ctx(), three, '~999'), ['c']);
    });

    test('empty data returns nothing', () => {
      assert.deepEqual(run(ctx(), [], '~100'), []);
    });
  });

  suite('struct/union search', () => {
    test('matches a struct member name when enabled', () => {
      const structs = {
        Foo: new StructEntry({
          name: 'Foo', size: '0x4', loc: '',
          vars: [{ name: 'target', type: 'int', offset: '0x0' }],
        }),
      };
      const entries = [data('health', '0x100')];
      entries[0] = new DataEntry({ name: 'health', type: 'struct Foo', addr: '0x100', loc: '' });

      const context = ctx({ structs, searchStructsUnions: true });
      assert.deepEqual(run(context, entries, 'target'), ['health']);
      // Without the option, the member name is not searched
      assert.deepEqual(run(ctx({ structs }), entries, 'target'), []);
    });

    test('does not infinite-loop on a self-referential struct', () => {
      const structs = {
        Node: new StructEntry({
          name: 'Node', size: '0x4', loc: '',
          vars: [{ name: 'next', type: 'struct Node', offset: '0x0' }],
        }),
      };
      const entries = [
        new DataEntry({ name: 'root', type: 'struct Node', addr: '0x100', loc: '' }),
      ];
      assert.deepEqual(run(ctx({ structs, searchStructsUnions: true }), entries, 'zzz'), []);
    });
  });

  suite('enum search', () => {
    test('matches an enum value name when enabled', () => {
      const enums = {
        MyEnum: new EnumEntry({
          name: 'MyEnum', loc: '',
          vals: [{ name: 'FLAG_ON', val: '0x1' }],
        }),
      };
      const entries = [
        new DataEntry({ name: 'flags', type: 'int', addr: '0x100', enum: 'MyEnum', loc: '' }),
      ];
      assert.deepEqual(run(ctx({ enums, searchEnums: true }), entries, 'flag_on'), ['flags']);
      assert.deepEqual(run(ctx({ enums }), entries, 'flag_on'), []);
    });
  });

  suite('highlightRegex', () => {
    test('is null when there are no positive terms', () => {
      assert.isNull(FilterEngine.highlightRegex(FilterParser.parse('-foo')));
      assert.isNull(FilterEngine.highlightRegex(FilterParser.parse('=100')));
    });

    test('combines positive terms into one case-insensitive regex', () => {
      const re = FilterEngine.highlightRegex(FilterParser.parse('foo bar'));
      assert.instanceOf(re, RegExp);
      assert.equal(re!.source, 'foo|bar');
      assert.isTrue(re!.ignoreCase);
      // Note: `re` has the `g` flag, so `.test()` is stateful — only call it once here
      assert.match('BAR', re!);
    });
  });
});
