import { LitElement, html, css, nothing } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { RefEntry, RefItem } from './info-entry';
import { toHex } from './utils';

const REF_CATEGORIES: [string, string][] = [
  ['call', 'Function calls'],
  ['pool', 'Code references'],
  ['data', 'Data references'],
];

const monoFont = css`Menlo, Monaco, "Courier New", monospace`;

/** Dialog listing the references to a single entry */
@customElement('map-refs')
export class MapRefs extends LitElement {
  static override styles = css`
    .refs-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    .refs-dialog {
      background: #202020;
      color: #f0f0f0;
      border: 1px solid #808080;
      border-radius: 8px;
      padding: 15px 25px;
      min-width: 300px;
      max-width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      text-align: left;
      font-family: verdana, sans-serif;
    }
    .refs-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 40px;
    }
    .refs-header h2 {
      margin: 0;
      font-size: 120%;
    }
    .refs-name {
      font-family: ${monoFont};
      color: #9cdcfe;
    }
    .refs-close {
      background: none;
      border: none;
      color: #b0b0b0;
      font-size: 18px;
      line-height: 1;
      padding: 6px 8px;
      cursor: pointer;
      border-radius: 5px;
    }
    .refs-close:hover {
      background: #383838;
    }

    h3 {
      margin-bottom: 4px;
    }
    ul {
      list-style: none;
      padding: 0;
      margin: 0 0 10px;
    }
    li {
      margin: 4px 0;
      font-family: ${monoFont};
    }
    .ref-index {
      color: #b0b0b0;
    }
    .ref-offset {
      color: #b0b0b0;
    }
    .no-refs {
      color: #b0b0b0;
    }
  `;

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
    if (!this.open) {
      return nothing;
    }
    const hasRefs = REF_CATEGORIES.some(([c]) => this.refs[c]?.length);
    return html`
      <div class="refs-overlay" @click="${this.close}">
        <div class="refs-dialog" @click="${(e: Event) => e.stopPropagation()}">
          <div class="refs-header">
            <h2>References to <span class="refs-name">${this.entryName}</span></h2>
            <button class="refs-close" title="Close" @click="${this.close}">✕</button>
          </div>
          ${hasRefs
            ? REF_CATEGORIES.map(([c, label]) => this.renderCategory(c, label))
            : html`<p class="no-refs">No references.</p>`}
        </div>
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'map-refs': MapRefs;
  }
}
