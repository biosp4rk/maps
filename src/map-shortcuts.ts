import { LitElement, html, css, nothing } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import {
  GAMES, MAPS, GAME_SHORTCUTS, MAP_SHORTCUTS, REGION_SHORTCUTS
} from './constants';

@customElement('map-shortcuts')
export class MapShortcuts extends LitElement {
  static override styles = css`
    .shortcuts-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    .shortcuts-dialog {
      background: #202020;
      color: #f0f0f0;
      border: 1px solid #808080;
      border-radius: 8px;
      padding: 15px 25px;
      max-width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      text-align: left;
      font-family: verdana, sans-serif;
    }
    .shortcuts-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 40px;
    }
    .shortcuts-header h2 {
      margin: 0;
    }
    .shortcuts-close {
      background: none;
      border: none;
      color: #b0b0b0;
      font-size: 18px;
      line-height: 1;
      padding: 6px 8px;
      cursor: pointer;
      border-radius: 5px;
    }
    .shortcuts-close:hover {
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
      margin: 6px 0;
    }
    kbd {
      background: #101010;
      border: 1px solid #808080;
      border-radius: 4px;
      padding: 1px 6px;
      font-family: Menlo, Monaco, "Courier New", monospace;
    }
  `;

  @property({ type: Boolean }) open = false;

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private section(prefix: string, title: string, rows: [string, string][]) {
    return html`
      <h3>${title}</h3>
      <ul>
        ${rows.map(([k, label]) => html`
          <li><kbd>${prefix}</kbd> <kbd>${k}</kbd> - ${label}</li>`)}
      </ul>`;
  }
  
  override render() {
    if (!this.open) {
      return nothing;
    }
    const gameName = (v: string) => GAMES.find(g => g.value === v)?.name ?? v;
    const mapName = (v: string) => MAPS.find(m => m.value === v)?.name ?? v;
    return html`
      <div class="shortcuts-overlay" @click="${this.close}">
        <div class="shortcuts-dialog" @click="${(e: Event) => e.stopPropagation()}">
          <div class="shortcuts-header">
            <h2>Keyboard Shortcuts</h2>
            <button class="shortcuts-close" title="Close"
              @click="${this.close}">✕</button>
          </div>
          ${this.section('g', 'Game',
            Object.entries(GAME_SHORTCUTS).map(([k, v]) => [k, gameName(v)] as [string, string]))}
          ${this.section('m', 'Map',
            Object.entries(MAP_SHORTCUTS).map(([k, v]) => [k, mapName(v)] as [string, string]))}
          ${this.section('r', 'Region',
            Object.entries(REGION_SHORTCUTS).map(([k, v]) => [k, v] as [string, string]))}
          <h3>Other</h3>
          <ul>
            <li><kbd>Esc</kbd> - Reset filter</li>
            <li><kbd>?</kbd> - Show keyboard shortcuts</li>
          </ul>
        </div>
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'map-shortcuts': MapShortcuts;
  }
}
