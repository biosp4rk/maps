import { LitElement, html, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { TableType } from "./map-table";
import { GameStructList, GameEnumList, GameStruct } from './entry-types';
import {
  KEY_LABEL, KEY_TAGS, KEY_TYPE, KEY_ENUM, KEY_DESC, KEY_NOTES, getHideableColumns
} from './headings'
import { FilterItem, FilterParser, SearchType } from './filter-parser';

const URL_GAME = 'game';
const URL_MAP = 'map';
const URL_REGION = 'region';

const REGIONS = ['U', 'E', 'J'];

const GAMES = [
  {
    label: 'Metroid Fusion',
    value: 'mf',
  },
  {
    label: 'Metroid Zero Mission',
    value: 'zm',
  }
];

const MAP_RAM = 'ram';
const MAP_CODE = 'code';
const MAP_DATA = 'data';

const MAPS = [
  {
    label: 'RAM',
    value: MAP_RAM,
  },
  {
    label: 'ROM Code',
    value: MAP_CODE,
  },
  {
    label: 'ROM Data',
    value: MAP_DATA,
  }
];

/** Renders the application */
@customElement('map-app')
export class MapApp extends LitElement {
  static override styles = css`
    :host {
      display: block;
      color: white;
      font-family: verdana, sans-serif;
    }

    h1 {
      background: #202020;
      text-align: center;
      margin: 0;
    }

    button,
    input,
    select {
      background: black;
      color: white;
    }

    label::after {
      content: attr(data-results);
      display: block;
      position: absolute;
      font-family: verdana, sans-serif;
      font-size: 12px;
      font-weight: bold;
      right: 4px;
      top: 4px;
    }

    li {
      margin: 3px 0;
    }

    .search-box {
      position: relative;
      display: inline-block;
      box-sizing: border-box;
      width: 150px;
    }

    .checkbox-list {
      text-align: left;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .curr-page,
    .page-num {
      margin: 0px 4px;
    }
    .page-num {
      cursor: pointer;
      color: #A0A0E0;
    }
    .page-num:hover {
      text-decoration: underline;
    }

    #page {
      padding-bottom: 40px
    }

    #banner {
      background: #202020;
      margin: 0 0 15px 0;
      padding: 10px 0;
      position: sticky;
      text-align: center;
      top: 0;
      z-index: 1;
    }

    #options {
      display: inline-grid;
      row-gap: 15px;
      column-gap: 15px;
    }
    
    #selectors {
      grid-column: 1 / 3;
      grid-row: 1;
    }

    #filter {
      grid-column: 1;
      grid-row: 2;
    }
    #filter-search {
      margin-bottom: 5px;
    }
    #filter-options {
      grid-column: 2;
      grid-row: 2;
    }

    #page-nav {
      grid-column: 1 / 3;
      grid-row: 3;
      text-align: center;
    }
    #num-rows {
      margin-right: 10px;
    }
    #page-text {
      margin-left: 10px;
    }

    #column-vis {
      grid-column: 4;
      grid-row: 1 / 5;
    }
  `;

  /** game struct definitions */
  @property({ type: Object }) structs: GameStructList = {};
  /** game enum definitions */
  @property({ type: Object }) enums: GameEnumList = {};
  /** all map data for game and region */
  @property({ type: Array }) allData: Array<{ [key: string]: unknown }> = [];
  /** filtered map data to display */
  @property({ type: Array }) filterData: Array<{ [key: string]: unknown }> = [];
  /** mf or zm */
  @property({ type: String }) game = GAMES[0].value;
  /** U, E, or J */
  @property({ type: String }) region = REGIONS[0];
  /** ram, code, or data */
  @property({ type: String }) map = MAPS[0].value;
  /** hide table while fetching data */
  @property({ type: Boolean }) fetchingData = false;

  /** Columns that should not be displayed */
  private hiddenColumns: Set<string> = new Set<string>([KEY_TAGS, KEY_LABEL, KEY_NOTES]);
  private pageSize: number = 1000;
  private pageIndex: number = 0;

  constructor() {
    super();
    this.parseUrlParams();
    this.fetchData();
    document.body.addEventListener('keyup', (e: Event) => {
      if ((e as KeyboardEvent).key == 'Escape') {
        this.resetFilter();
      }
    })
  }

  private parseUrlParams() {
    // check for game, region, and map in search params
    const params = new URLSearchParams(window.location.search);
    const game = params.get(URL_GAME) || '';
    if (GAMES.some(x => x.value === game)) {
      this.game = game;
    }
    const region = params.get(URL_REGION)?.toUpperCase() || '';
    if (REGIONS.includes(region)) {
      this.region = region;
    }
    const map = params.get(URL_MAP) || '';
    if (MAPS.some(x => x.value === map)) {
      this.map = map;
    }
  }

  private setUrlParams() {
    const params = new URLSearchParams();
    params.set(URL_GAME, this.game);
    params.set(URL_REGION, this.region.toLowerCase());
    params.set(URL_MAP, this.map);
    const url = window.location.pathname + '?' + params.toString();
    window.history.replaceState(null, '', url);
  }

  private getRegionEntry(entry: { [key: string]: unknown }) {
    if (typeof entry.addr == 'object') {
      const addrs = entry.addr as { [key: string]: string };
      if (this.region in addrs) {
        entry.addr = addrs[this.region]
      } else {
        entry.addr = null;
      }
    }
    // functions may have different sizes
    if (typeof entry.size == 'object') {
      const sizes = entry.size as { [key: string]: string };
      if (this.region in sizes) {
        entry.size = sizes[this.region]
      } else {
        entry.addr = null;
      }
    }
  }

  async fetchData() {
    if (!this.game || !this.region || !this.map) {
      return;
    }
    // read data from json files
    this.fetchingData = true;
    const targetBaseUrl = `/maps/json/${this.game}/`;

    // get enums
    let enms = await fetch(targetBaseUrl + 'enums.json')
      .then(response => response.json());
    for (const key in enms) {
      enms[key] = Object.assign([], enms[key]);
    }
    this.enums = enms as GameEnumList;

    // get structs
    let strcts = await fetch(targetBaseUrl + 'structs.json')
      .then(response => response.json());
    for (const key in strcts) {
      strcts[key] = Object.assign(new GameStruct(), strcts[key]);
    }
    this.structs = strcts as GameStructList;

    // get map data
    let fullData: Array<{ [key: string]: unknown }> = await fetch(targetBaseUrl + `${this.map}.json`)
      .then(response => response.json());
    // filter data by region
    fullData.forEach(entry => this.getRegionEntry(entry));
    this.allData = fullData.filter(entry => entry.addr !== null);

    this.filterData = this.allData;
    this.pageIndex = 0;
    this.clearFilter();
    this.setUrlParams();

    this.fetchingData = false;
  }

  private inputHandler(e: Event) {
    let ke = (e as KeyboardEvent);
    if (ke.key == 'Enter') {
      this.applyFilter();
    }
  }

  private checkFiltersOnDesc(desc: string, items: Array<FilterItem>): boolean {
    // get description and its terms for searching
    const descLower = desc.toLowerCase();
    const descTerms = descLower.split(' ');
    // check each item in filter
    for (const item of items) {
      if (item.type === SearchType.Term) {
        if (descTerms.includes(item.text) === item.exclude) {
          return false;
        }
      } else if (item.type === SearchType.Quote) {
        if (descLower.includes(item.text) === item.exclude) {
          return false;
        }
      } else if (item.type === SearchType.Regex) {
        if (item.regex!.test(desc) === item.exclude) {
          return false;
        }
      }
    }
    return true;
  }

  private applyFilter() {
    const box = this.shadowRoot?.querySelector('input.search-box') as HTMLInputElement;
    const text = box.value;
    if (text === '') {
      this.resetFilter();
      return;
    }

    // parse to get filter items
    const items = FilterParser.parse(text);
    const checkStruct = this.filterStructs();
    const checkEnum = this.filterEnums();

    this.pageIndex = 0;
    this.filterData = this.allData.filter(entry => {
      // check entry's description
      const desc = entry[KEY_DESC] as string;
      if (this.checkFiltersOnDesc(desc, items)) {
        return true;
      }
      // check if entry is struct
      if (checkStruct && KEY_TYPE in entry) {
        const name = entry[KEY_TYPE] as string;
        if (name in this.structs) {
          const es = this.structs[name];
          if (es.vars.some(rv => this.checkFiltersOnDesc(rv.desc, items))) {
            return true;
          }
        }
      }
      // check if entry has enum
      if (checkEnum && KEY_ENUM in entry) {
        const name = entry[KEY_ENUM] as string;
        if (name in this.enums) {
          const ee = this.enums[name];
          if (ee.some(ev => this.checkFiltersOnDesc(ev.desc, items))) {
            return true;
          }
        }
      }
      return false;
    });
    this.collapseAll();
  }

  private clearFilter() {
    const box = this.shadowRoot?.querySelector('input.search-box') as HTMLInputElement;
    box.value = '';
  }

  private resetFilter() {
    if (this.filterData.length < this.allData.length) {
      this.filterData = this.allData;
      this.collapseAll();
    }
    this.clearFilter();
  }

  private collapseAll() {
    this.shadowRoot?.querySelector('map-table')!.collapseAll();
  }

  private filterStructs(): boolean {
    const cb = this.shadowRoot?.querySelector('#filter-structs') as HTMLInputElement;
    return cb.checked;
  }

  private filterEnums(): boolean {
    const cb = this.shadowRoot?.querySelector('#filter-enums') as HTMLInputElement;
    return cb.checked;
  }

  private gameChangeHandler() {
    this.game =
      (this.shadowRoot!.querySelector('#game-select')! as HTMLInputElement)
        .value;
    this.fetchData();
  }

  private regionChangeHandler() {
    this.region =
      (this.shadowRoot!.querySelector('#region-select')! as HTMLInputElement)
        .value;
    this.fetchData();
  }

  private mapChangeHandler() {
    this.map =
      (this.shadowRoot!.querySelector('#map-select')! as HTMLInputElement)
        .value;
    this.fetchData();
  }

  private toggleColumn(event: any) {
    const colName = event.target.id;
    const visible = event.target.checked;
    if (visible) {
      this.hiddenColumns.delete(colName);
    } else {
      this.hiddenColumns.add(colName);
    }

    const table = this.shadowRoot?.querySelector('map-table')!;
    table.updateVisibleColumns();
    this.requestUpdate();
  }

  private pageNumClicked(event: any) {
    const idx = parseInt(event.target.innerText) - 1;
    if (idx !== this.pageIndex) {
      this.pageIndex = idx;
      this.requestUpdate();
    }
  }

  private renderPageNav() {
    let content;
    if (this.fetchingData) {
      content = 'Loading...';
    } else {
      // row info
      const numRows = this.filterData.length;
      const firstRow = this.pageIndex * this.pageSize + 1;
      const lastRow = Math.min(firstRow + this.pageSize - 1, numRows);
      // page info
      const numPages = Math.max(Math.ceil(numRows / this.pageSize), 1);
      const pages = [...Array(numPages).keys()];
      const rowText = numRows > 0 ?
        `${firstRow}-${lastRow} of ${numRows}` : 'No results';
      content = html`
        <span id="num-rows">${rowText}</span>
        <span id="page-text">Page:</span>
        ${pages.map(p => html`
          <span class="${p === this.pageIndex ? 'curr-page' : 'page-num'}"
            @click="${this.pageNumClicked}">${p + 1}</span>`)}`;
    }
    return html`<div id="page-nav">${content}</div>`;
  }

  private getTableType(): TableType {
    switch(this.map) {
      case MAP_RAM: return TableType.RamList;
      case MAP_DATA: return TableType.DataList;
      case MAP_CODE: return TableType.CodeList;
      default: return TableType.None;
    }
  }

  private renderTable() {
    if (this.fetchingData) {
      return '';
    }
    const firstRow = this.pageIndex * this.pageSize;
    const lastRow = firstRow + this.pageSize;
    return html`<map-table
      .tableType="${this.getTableType()}"
      .data="${this.filterData.slice(firstRow, lastRow)}"
      .structs="${this.structs}"
      .enums="${this.enums}"
      .hiddenColumns="${this.hiddenColumns}">
    </map-table>`;
  }

  override render() {
    return html`
      <div id="page">
        <h1>GBA Metroid Data Maps</h1>
        <div id="banner">
          <div id="options">
            <div id="selectors">
              <select id="game-select" @change="${this.gameChangeHandler}">
                ${GAMES.map(game => html`<option value="${game.value}" ?selected="${this.game == game.value}">${game.label}</option>`)}
              </select>
              <select id="map-select" @change="${this.mapChangeHandler}">
                  ${MAPS.map(map => html`<option value="${map.value}" ?selected="${this.map == map.value}">${map.label}</option>`)}
              </select>
              <select id="region-select" @change="${this.regionChangeHandler}">
                ${REGIONS.map(reg => html`<option value="${reg}" ?selected="${this.region == reg}">${reg}</option>`)}
              </select>
            </div>
            <div id="filter">
              <div id="filter-search">
                Filter:
                <input class="search-box" @keyup='${this.inputHandler}'/>
              </div>
              <div>
                <button @click="${this.applyFilter}">Apply</button>
                <button @click="${this.resetFilter}">Reset</button>
                <button @click="${this.collapseAll}">Collapse All</button>
              </div>
            </div>
            <ul id="filter-options" class="checkbox-list">
              <li title="Include struct info when filtering">
                <input type="checkbox" id="filter-structs">
                <label for="filter-structs">Structs</label>
              </li>
              <li title="Include enum info when filtering">
                <input type="checkbox" id="filter-enums">
                <label for="filter-enums">Enums</label>
              </li>
            </ul>
            ${this.renderPageNav()}
            <ul id="column-vis" class="checkbox-list">
              ${getHideableColumns(this.map).map(
                col => html`<li>
                  <input type="checkbox" id="${col.key}"
                    .checked=${!this.hiddenColumns.has(col.key)}
                    @change="${this.toggleColumn}">
                  <label for="${col.key}">${col.head}</label>
              </li>`)}
            </ul>
          </div>
        </div>
        ${this.renderTable()}
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'map-app': MapApp;
  }
}
