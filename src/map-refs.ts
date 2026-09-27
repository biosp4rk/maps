import { LitElement, html, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { RefEntry, RefItem } from './info-entry';
import { toHex } from './utils';
import { dialogStyles, renderDialog } from './dialog';
import { colorMuted, colorAccent } from './theme';

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

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private renderItem(item: RefItem) {
    const index = item.index !== undefined
      ? html`<span class="ref-index">[${item.index}]</span>` : '';
    return html`<li>${item.name}${index}
      <span class="ref-offset">+0x${toHex(item.offset)}</span></li>`;
  }

  private renderCategory(category: string, label: string) {
    const items = this.refs[category];
    if (!items || items.length === 0) {
      return '';
    }
    return html`
      <h3>${label} (${items.length})</h3>
      <ul>${items.map(item => this.renderItem(item))}</ul>`;
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
