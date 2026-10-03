import { LitElement, html, css, nothing } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { RefEntry, RefItem } from './info-entry';
import { toHex } from './utils';
import { dialogStyles, renderDialog } from './dialog';
import { MAP_DATA, MAP_CODE, URL_MAP, URL_FILTER } from './constants';
import { colorMuted, colorAccent } from './theme';
import { ScrollLock } from './scroll-lock';

const REF_CATEGORIES: [string, string][] = [
  ['call', 'Function calls'],
  ['pool', 'Code references'],
  ['data', 'Data references'],
];

const monoFont = css`Menlo, Monaco, "Courier New", monospace`;

/** Dialog listing the references to a single entry */
@customElement('map-refs')
export class MapRefs extends LitElement {
  static override styles = [dialogStyles, css`
    .refs-name {
      font-family: ${monoFont};
      color: ${colorAccent};
    }
    h3 {
      margin-bottom: 4px;
    }
    ul {
      list-style: none;
      padding: 0;
      margin-bottom: 10px;
    }
    li {
      margin: 4px 0;
      font-family: ${monoFont};
    }

    .item-name {
      color: ${colorAccent};
    }
    .ref-offset,
    .ref-index {
      color: ${colorMuted};
    }
    .no-refs {
      color: ${colorMuted};
    }
  `];

  @property({ type: Boolean }) open = false;
  @property({ type: String }) entryName = '';
  @property({ type: Object }) refs: RefEntry = {};

  constructor() {
    super();
    // Locks page scroll while the dialog is open
    new ScrollLock(this, () => this.open);
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private renderItem(item: RefItem, category: string) {
    // Get URL with map type and filter
    const params = new URLSearchParams(window.location.search);
    params.set(URL_MAP, category === 'data' ? MAP_DATA : MAP_CODE);
    params.set(URL_FILTER, `"${item.name}"`);
    const url = '?' + params.toString();
    const index = item.index !== undefined
      ? html`<span class="ref-index">[${item.index}]</span>` : nothing;
    return html`<li><a href="${url}" class="item-name">${item.name}</a>${index}
      <span class="ref-offset">+0x${toHex(item.offset)}</span></li>`;
  }

  private renderCategory(category: string, label: string) {
    const items = this.refs[category];
    if (!items || items.length === 0) {
      return nothing;
    }
    return html`
      <h3>${label} (${items.length})</h3>
      <ul>${items.map(item => this.renderItem(item, category))}</ul>`;
  }

  override render() {
    const hasRefs = REF_CATEGORIES.some(([c]) => this.refs[c]?.length);
    const title = html`References to <span class="refs-name">${this.entryName}</span>`;
    const body = hasRefs
      ? REF_CATEGORIES.map(([c, label]) => this.renderCategory(c, label))
      : html`<p class="no-refs">No references.</p>`;
    return renderDialog(this.open, title, body, () => this.close());
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'map-refs': MapRefs;
  }
}
