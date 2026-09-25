import { MapTable } from '../map-table.js';
import { DataEntry } from '../info-entry.js';
import { TableType, KEY_DESC } from '../constants.js';

import { fixture, html, assert } from '@open-wc/testing';

async function ramTable(hidden: Set<string> = new Set<string>()): Promise<MapTable> {
  const entries = [
    new DataEntry({ name: 'health', type: 'int', addr: '0x100', loc: 'file.c:5' }),
  ];
  // Set properties in the template so the very first render has a valid table type
  return fixture<MapTable>(html`
    <map-table
      .tableType=${TableType.RamList}
      .githubUrl=${'https://example.com/tree/abc/'}
      .hiddenColumns=${hidden}
      .entries=${entries}>
    </map-table>`);
}

suite('map-table', () => {
  test('is defined', () => {
    assert.instanceOf(document.createElement('map-table'), MapTable);
  });

  test('renders the name as a link built from githubUrl and loc', async () => {
    const el = await ramTable();
    const link = el.shadowRoot!.querySelector('a.name-span') as HTMLAnchorElement;
    assert.exists(link);
    assert.include(link.textContent ?? '', 'health');
    assert.include(link.href, 'https://example.com/tree/abc/file.c#L5');
  });

  test('omits a hidden column', async () => {
    const shown = await ramTable();
    assert.exists(shown.shadowRoot!.querySelector('.desc'));

    const hidden = await ramTable(new Set([KEY_DESC]));
    assert.isNull(hidden.shadowRoot!.querySelector('.desc'));
  });
});
