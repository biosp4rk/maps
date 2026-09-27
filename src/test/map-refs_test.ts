import { MapRefs } from '../map-refs.js';

import { fixture, html, assert } from '@open-wc/testing';

async function refsDialog(open: boolean, refs: Record<string, any>): Promise<MapRefs> {
  return fixture<MapRefs>(html`
    <map-refs .open=${open} .entryName=${'gThing'} .refs=${refs}></map-refs>`);
}

suite('map-refs', () => {
  test('is defined', () => {
    assert.instanceOf(document.createElement('map-refs'), MapRefs);
  });

  test('renders nothing when closed', async () => {
    const el = await refsDialog(false, { pool: [{ name: 'FuncA', offset: 8 }] });
    assert.isNull(el.shadowRoot!.querySelector('.refs-dialog'));
  });

  test('lists references grouped by category with counts and offsets', async () => {
    const el = await refsDialog(true, {
      call: [{ name: 'Caller', offset: 4 }],
      data: [{ name: 'sTable', index: 3, offset: 0 }],
    });
    const text = el.shadowRoot!.textContent ?? '';
    assert.include(text, 'gThing');
    assert.include(text, 'Function calls (1)');
    assert.include(text, 'Data references (1)');
    assert.include(text, 'Caller');
    assert.include(text, '+0x4');
    // data references show their array index
    assert.include(text, 'sTable');
    assert.include(text, '[3]');
  });

  test('dispatches a close event when the close button is clicked', async () => {
    const el = await refsDialog(true, { pool: [{ name: 'FuncA', offset: 8 }] });
    let closed = false;
    el.addEventListener('close', () => { closed = true; });
    (el.shadowRoot!.querySelector('.refs-close') as HTMLElement).click();
    assert.isTrue(closed);
  });

  test('shows a fallback when there are no references', async () => {
    const el = await refsDialog(true, {});
    assert.include(el.shadowRoot!.textContent ?? '', 'No references');
  });
});
