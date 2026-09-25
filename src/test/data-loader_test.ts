import { DataLoader } from '../data-loader.js';
import { TableType } from '../constants.js';

import { assert } from '@open-wc/testing';

const STRUCTS = [
  { name: 'Foo', size: '0x4', loc: '', vars: [{ name: 'a', type: 'int', offset: '0x0' }] },
];
const ENUMS = [{ name: 'MyEnum_', loc: '', vals: [{ name: 'A', val: '0x0' }] }];
const RAM = [
  { name: 'first', type: 'int', addr: '0x100', loc: '' },
  { name: 'second', type: 'int', addr: { U: '0x200' }, loc: '' },
  { name: 'missing', type: 'int', addr: { E: '0x300' }, loc: '' },
];

function fixtureFor(url: string): unknown[] {
  if (url.includes('/structs.')) { return STRUCTS; }
  if (url.includes('/enums.')) { return ENUMS; }
  if (url.includes('/ram.')) { return RAM; }
  // unions, typedefs
  return [];
}

let fetchCount: { [url: string]: number };
let originalFetch: typeof window.fetch;

suite('data-loader', () => {
  setup(() => {
    fetchCount = {};
    originalFetch = window.fetch;
    window.fetch = ((input: RequestInfo | URL) => {
      const url = String(input);
      const key = url.split('?')[0];
      fetchCount[key] = (fetchCount[key] ?? 0) + 1;
      // Clone so the loader never mutates the shared fixtures (real fetch returns fresh objects)
      const body = JSON.parse(JSON.stringify(fixtureFor(url)));
      return Promise.resolve(
        { json: () => Promise.resolve(body) } as unknown as Response);
    }) as typeof window.fetch;
  });

  teardown(() => {
    window.fetch = originalFetch;
  });

  test('loads and region-filters map data', async () => {
    const loader = new DataLoader();
    const { entries } = await loader.load('zm', 'U', 'ram', TableType.RamList);
    // 'missing' has no U address and is dropped
    assert.deepEqual(entries.map(e => e.name), ['first', 'second']);
    // the region-specific address is applied
    assert.equal((entries[1] as any).addr, 0x200);
  });

  test('strips a trailing underscore from enum names', async () => {
    const loader = new DataLoader();
    const { gameData } = await loader.load('zm', 'U', 'ram', TableType.RamList);
    assert.property(gameData.enums, 'MyEnum');
    assert.notProperty(gameData.enums, 'MyEnum_');
  });

  test('builds sorted definition entries without fetching a map file', async () => {
    const loader = new DataLoader();
    const { entries } = await loader.load('zm', 'U', 'structs', TableType.StructList);
    assert.deepEqual(entries.map(e => e.name), ['Foo']);
  });

  test('caches game definitions across region and map changes', async () => {
    const loader = new DataLoader();
    await loader.load('zm', 'U', 'ram', TableType.RamList);
    await loader.load('zm', 'E', 'ram', TableType.RamList);
    await loader.load('zm', 'E', 'code', TableType.CodeList);
    assert.equal(fetchCount['/json/zm/structs.json'], 1);
  });

  test('refetches definitions when the game changes', async () => {
    const loader = new DataLoader();
    await loader.load('zm', 'U', 'ram', TableType.RamList);
    await loader.load('mf', 'U', 'ram', TableType.RamList);
    assert.equal(fetchCount['/json/zm/structs.json'], 1);
    assert.equal(fetchCount['/json/mf/structs.json'], 1);
  });
});
