import { LitElement, html, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import {
  GAMES, MAPS, TableType, REGIONS, KEY_LABEL, KEY_NOTES,
  KEY_TAGS, getMainTableType, getHideableColumns
} from './constants'
import {
  GameEntry, GameData, GameCode, GameStructDict, GameEnumDict, GameStruct, GameEnum, DictEntry
} from './entry-types';
import { FilterItem, FilterParser, SearchType } from './filter-parser';
import "./map-table";

const VER = 2;

const URL_GAME = 'game';
const URL_MAP = 'map';
const URL_REGION = 'region';
const URL_FILTER = 'filter';
const URL_OPTIONS = 'options';

const OPT_STRUCTS = 's';
const OPT_ENUMS = 'e';

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
  @property({ type: Object }) structs: GameStructDict = {};
  /** game enum definitions */
  @property({ type: Object }) enums: GameEnumDict = {};
  /** all map data for game and region */
  @property({ type: Array }) allData: GameEntry[] = [];
  /** filtered map data to display */
  @property({ type: Array }) filterData: GameEntry[] = [];
  /** mf or zm */
  @property({ type: String }) game = GAMES[0].value;
  /** U, E, or J */
  @property({ type: String }) region = REGIONS[0];
  /** ram, code, data, structs, or enums */
  @property({ type: String }) map = MAPS[0].value;
  /** hide table while fetching data */
  @property({ type: Boolean }) fetchingData = false;

  private tableType: TableType = getMainTableType(this.map);
  private filter: string = '';
  private searchStructs: boolean = false;
  private searchEnums: boolean = false;
  private hiddenColumns: Set<string> = new Set<string>([KEY_TAGS, KEY_LABEL, KEY_NOTES]);
  private pageSize: number = 1000;
  private pageIndex: number = 0;

  constructor() {
    super();
    this.parseUrlParams();
    this.fetchData(true, false);
    document.body.addEventListener('keyup', (e: Event) => {
      if ((e as KeyboardEvent).key == 'Escape') {
        this.resetFilter();
      }
    });
  }

  override firstUpdated() {
    this.setFilterText(this.filter);
  }

  private parseUrlParams() {
    // check for game, region, and map
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
      this.setMapType(map);
    }
    // check for filter
    const filter = params.get(URL_FILTER);
    if (filter) {
      this.filter = filter;
    }
    // check for options
    const optStr = params.get(URL_OPTIONS);
    if (optStr) {
      const opts = optStr.split(',');
      this.searchStructs = opts.includes(OPT_STRUCTS)
      this.searchEnums = opts.includes(OPT_ENUMS)
    }
  }

  private setUrlParams() {
    const params = new URLSearchParams();
    params.set(URL_GAME, this.game);
    params.set(URL_REGION, this.region.toLowerCase());
    params.set(URL_MAP, this.map);
    if (this.filter) {
      params.set(URL_FILTER, this.filter);
    }
    // check options
    const opts = [];
    if (this.searchStructs) { opts.push(OPT_STRUCTS); }
    if (this.searchEnums) { opts.push(OPT_ENUMS); }
    if (opts.length > 0) {
      params.set(URL_OPTIONS, opts.join(','));
    }
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
        return;
      }
    }
    // data may have different counts
    if (typeof entry.count == 'object') {
      const counts = entry.count as { [key: string]: string };
      if (this.region in counts) {
        entry.count = counts[this.region]
      }
    }    
    // functions may have different sizes
    if (typeof entry.size == 'object') {
      const sizes = entry.size as { [key: string]: string };
      if (this.region in sizes) {
        entry.size = sizes[this.region]
      }
    }
  }

  private getJsonUrl(jsonName: string): string {
    const baseUrl = `/maps/json/${this.game}/`;
    const fileName = jsonName + '.json';
    const ver = '?v=' + VER;
    return baseUrl + fileName + ver;
  }

  async fetchData(first: boolean, keepFilter: boolean) {
    if (!this.game || !this.region || !this.map) {
      return;
    }
    
    if (!first && !keepFilter) {
      this.clearFilter();
    }

    // read data from json files
    this.fetchingData = true;

    // get enums
    const enumList = await fetch(this.getJsonUrl('enums'))
      .then(response => response.json());
    this.enums = {};
    for (const entry of enumList) {
      this.enums[entry[KEY_LABEL]] = new GameEnum(entry)
    }

    // get structs
    const structList = await fetch(this.getJsonUrl('structs'))
      .then(response => response.json());
    this.structs = {};
    for (const entry of structList) {
      this.structs[entry[KEY_LABEL]] = new GameStruct(entry)
    }

    // get map data
    if (this.tableHasAddr()) {
      // ram, code, or data
      let fullData: DictEntry[] = await fetch(this.getJsonUrl(this.map))
        .then(response => response.json());
      // filter by region
      fullData.forEach(entry => this.getRegionEntry(entry));
      fullData = fullData.filter(entry => entry.addr !== null);
      // convert to classes
      if (this.tableIs(TableType.CodeList)) {
        this.allData = fullData.map(entry => new GameCode(entry));
      } else {
        this.allData = fullData.map(entry => new GameData(entry));
      }
    } else {
      // structs or enums
      const entries = this.tableIs(TableType.StructList) ? this.structs : this.enums;
      this.allData = Object.values(entries).sort((a, b) => {
        if (a < b) { return -1; }
        if (a > b) { return 1; }
        return 0;
      });
    }

    this.filterData = this.allData;
    // check if loading page with filter
    if ((first || keepFilter) && this.filter) {
      this.applyFilter();
    }

    if (!first) {
      this.pageIndex = 0;
      this.setUrlParams();
    }

    this.fetchingData = false;
  }

  private inputHandler(e: Event) {
    let ke = (e as KeyboardEvent);
    if (ke.key == 'Enter') {
      this.userApplyFilter();
    }
  }

  private getFilterBox(): HTMLInputElement {
    return this.shadowRoot?.querySelector('input.search-box') as HTMLInputElement;
  }

  private getFilterText(): string {
    const box = this.getFilterBox();
    return box.value;
  }

  private setFilterText(text: string) {
    const box = this.getFilterBox();
    box.value = text;
  }

  private checkDescFilter(
    desc: string,
    item: FilterItem,
    structName: string = '',
    enm: string = ''
  ): boolean {
    // get description and its terms for searching
    desc = desc.toLowerCase();
    const descTerms = desc.split(' ');
    // check description
    if (item.type === SearchType.Term) {
      if (descTerms.includes(item.text) !== item.exclude) {
        return true;
      }
    } else if (item.type === SearchType.Quote) {
      if (desc.includes(item.text) !== item.exclude) {
        return true;
      }
    } else if (item.type === SearchType.Regex) {
      if (item.regex!.test(desc) !== item.exclude) {
        return true;
      }
    }
    // check if entry is struct
    if (this.searchStructs && structName && structName in this.structs) {
      const es = this.structs[structName];
      if (es.vars.some(
        rv => this.checkDescFilter(rv.desc, item, rv.structName, rv.enum))
      ) {
        return true;
      }
    }
    // check if entry has enum
    if (this.searchEnums && enm && enm in this.enums) {
      const ee = this.enums[enm].vals;
      if (ee.some(ev => this.checkDescFilter(ev.desc, item))) {
        return true;
      }
    }
    // did not match desc, struct var, or enum val
    return false;
  }

  private checkAddrFilter(addr: number, item: FilterItem): boolean {
    switch (item.type) {
      case SearchType.AddrEQ:
        if ((addr === item.addr!) !== item.exclude) {
          return true;
        }
        break;
      case SearchType.AddrGT:
        if ((addr > item.addr!) !== item.exclude) {
          return true;
        }
        break;
      case SearchType.AddrLT:
        if ((addr < item.addr!) !== item.exclude) {
          return true;
        }
        break;
      case SearchType.AddrGE:
        if ((addr >= item.addr!) !== item.exclude) {
          return true;
        }
        break;
      case SearchType.AddrLE:
        if ((addr <= item.addr!) !== item.exclude) {
          return true;
        }
        break;
    }
    return false;
  }

  private handleNearAddrFilter(item: FilterItem) {
    const target = item.addr!
    // find index of first entry past address
    // TODO: binary search
    let idx = this.filterData.findIndex(
      entry => entry.sortValue() > target);
    let exact = false;
    if (idx === -1) {
      idx = this.filterData.length;
    }
    if (idx - 1 >= 0) {
      // check if exact match
      let addr;
      let size;
      const entry = this.filterData[idx - 1];
      if (this.tableIs(TableType.CodeList)) {
        const gc = entry as GameCode;
        addr = gc.addr
        size = gc.size;
      } else {
        const gd = entry as GameData;
        addr = gd.addr;
        size = gd.getLength(this.structs);
      }
      if (target >= addr && target < addr + size) {
        exact = true;
      }
    }
    // get left/right entries
    let left = idx - 1;
    if (exact) { left--; }
    if (left < 0) { left = 0; }
    let right = idx;
    const numEntries = this.filterData.length;
    if (right >= numEntries) {
      right = numEntries - 1;
    }
    this.filterData = this.filterData.slice(left, right + 1);
  }

  private applyFilter() {
    // parse to get filter items
    const items = FilterParser.parse(this.filter);
    this.pageIndex = 0;

    // check each filter item
    this.filterData = this.allData;
    for (const item of items) {
      switch (item.type) {
        case SearchType.Term:
        case SearchType.Quote:
        case SearchType.Regex:
          this.filterData = this.filterData.filter(entry => {
            let sName = undefined;
            let eName = undefined;
            if (this.tableIs(TableType.RamList, TableType.DataList)) {
              const gd = entry as GameData;
              if (this.searchStructs) {
                sName = gd.structName;
              }
              if (this.searchEnums) {
                eName = gd.enum;
              }
            } else if (this.tableIs(TableType.StructList) && this.searchStructs) {
              const gs = entry as GameStruct;
              sName = gs.label;
            } else if (this.tableIs(TableType.EnumList) && this.searchEnums) {
              const ge = entry as GameEnum;
              eName = ge.label;
            }
            return this.checkDescFilter(entry.desc, item, sName, eName);
          });
          break;
        case SearchType.AddrEQ:
        case SearchType.AddrGT:
        case SearchType.AddrLT:
        case SearchType.AddrGE:
        case SearchType.AddrLE:
          if (this.tableHasAddr()) {
            this.filterData = this.filterData.filter(entry => {
              return this.checkAddrFilter(entry.sortValue(), item);
            });
          } else {
            this.filterData = [];
          }
          break;
        case SearchType.AddrNear:
          if (this.tableHasAddr()) {
            this.handleNearAddrFilter(item);
          } else {
            this.filterData = [];
          }
          break;
      }
    }
  }

  private userApplyFilter() {
    const text = this.getFilterText();
    if (text === '') {
      this.resetFilter();
      return;
    }

    this.filter = text;
    this.applyFilter();
    this.collapseAll();
    this.setUrlParams();
  }

  private clearFilter() {
    this.filter = '';
    this.setFilterText('');
    this.setUrlParams();
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

  private structsChangeHandler() {
    const cb = this.shadowRoot?.querySelector('#filter-structs') as HTMLInputElement;
    this.searchStructs = cb.checked;
  }

  private enumsChangeHandler() {
    const cb = this.shadowRoot?.querySelector('#filter-enums') as HTMLInputElement;
    this.searchEnums = cb.checked;
  }

  private gameChangeHandler() {
    this.game =
      (this.shadowRoot!.querySelector('#game-select')! as HTMLInputElement)
        .value;
    this.fetchData(false, false);
  }

  private regionChangeHandler() {
    this.region =
      (this.shadowRoot!.querySelector('#region-select')! as HTMLInputElement)
        .value;
    this.fetchData(false, true);
  }

  private mapChangeHandler() {
    const map =
      (this.shadowRoot!.querySelector('#map-select')! as HTMLInputElement)
        .value;
    this.setMapType(map);
    this.fetchData(false, false);
  }

  private setMapType(map: string) {
    this.map = map;
    this.tableType = getMainTableType(map);
  }

  private tableIs(...tableTypes: TableType[]): Boolean {
    return tableTypes.includes(this.tableType);
  }

  private tableHasAddr(): Boolean {
    return this.tableIs(
      TableType.RamList,
      TableType.CodeList,
      TableType.DataList);
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

  private renderTable() {
    if (this.fetchingData) {
      return '';
    }
    const firstRow = this.pageIndex * this.pageSize;
    const lastRow = firstRow + this.pageSize;
    return html`<map-table
      .tableType="${this.tableType}"
      .entries="${this.filterData.slice(firstRow, lastRow)}"
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
                <button @click="${this.userApplyFilter}">Apply</button>
                <button @click="${this.resetFilter}">Reset</button>
                <button @click="${this.collapseAll}">Collapse All</button>
              </div>
            </div>
            <ul id="filter-options" class="checkbox-list">
              <li title="Include struct info when filtering">
                <input type="checkbox" id="filter-structs"
                  .checked=${this.searchStructs}
                  @change='${this.structsChangeHandler}'>
                <label for="filter-structs">Structs</label>
              </li>
              <li title="Include enum info when filtering">
                <input type="checkbox" id="filter-enums"
                  .checked=${this.searchEnums}
                  @change='${this.enumsChangeHandler}'>
                <label for="filter-enums">Enums</label>
              </li>
            </ul>
            ${this.renderPageNav()}
            <ul id="column-vis" class="checkbox-list">
              ${getHideableColumns(this.tableType).map(
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
