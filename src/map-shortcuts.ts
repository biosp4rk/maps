import { LitElement, html, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import {
  GAMES, MAPS, GAME_SHORTCUTS, MAP_SHORTCUTS, REGION_SHORTCUTS
} from './constants';
import { dialogStyles, renderDialog } from './dialog';

@customElement('map-shortcuts')
export class MapShortcuts extends LitElement {
  static override styles = [dialogStyles, css`
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
  `];

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
    const gameName = (v: string) => GAMES.find(g => g.value === v)?.name ?? v;
    const mapName = (v: string) => MAPS.find(m => m.value === v)?.name ?? v;
    const body = html`
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
      </ul>`;
    return renderDialog(this.open, 'Keyboard Shortcuts', body, () => this.close());
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'map-shortcuts': MapShortcuts;
  }
}
