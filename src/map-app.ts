import { LitElement, html, css, PropertyValues } from 'lit';
import { state, customElement } from 'lit/decorators.js';
import {
  GAMES, MAPS, TableType, REGIONS, GAME_SHORTCUTS, MAP_SHORTCUTS, REGION_SHORTCUTS,
  KEY_CAT, KEY_DESC, getMainTableType, getHideableColumns
} from './constants';
import {
  NamedEntry, StructEntryDict, UnionEntryDict, EnumEntryDict
} from './info-entry';
import { DataLoader } from './data-loader';
import { FilterItem, FilterParser } from './filter-parser';
import { FilterEngine } from './filter-engine';
import "./map-table";
import "./map-shortcuts";

const GIT_COMMIT_MF = 'b9245f582ae2ed434332486149e0ed2a37817657';
const GIT_COMMIT_ZM = '43b7fd52f552e4d38c1521ff9d4df5ee57e61493';

const GITHUB_URLS: { [key: string]: string } = {
  mf: 'https://github.com/metroidret/mf/tree/' + GIT_COMMIT_MF + '/',
  zm: 'https://github.com/metroidret/mzm/tree/' + GIT_COMMIT_ZM + '/',
};

const URL_GAME = 'game';
const URL_MAP = 'map';
const URL_REGION = 'region';
const URL_FILTER = 'filter';
const URL_OPTIONS = 'options';

const OPT_STRUCTS_UNIONS = 's';
const OPT_ENUMS = 'e';

/** Renders the application */
@customElement('map-app')
export class MapApp extends LitElement {
  static override styles = css`
    :host {
      display: block;
      color: #f0f0f0;
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
      color: #f0f0f0;
      border: 1px solid #606060;
      border-radius: 5px;
    }

    button {
      padding: 4px 7px;
    }
    input {
      padding: 3px 5px;
    }
    select {
      padding: 2px 2px;
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
      color: #a0a0e0;
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
      padding-bottom: 10px;
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
      grid-row: 1 / 4;
    }
  `;

  // Internal reactive state
  /** Filtered map data to display */
  @state()
  private filterData: NamedEntry[] = [];
  /** mf or zm */
  @state()
  private game = GAMES[0].value;
  /** U, E, J, or C */
  @state()
  private region = REGIONS[0];
  /** ram, code, data, structs, or enums */
  @state()
  private map = MAPS[0].value;
  /** Hide table while fetching data */
  @state()
  private fetchingData = false;
  /** Show pop-up with keyboard shortcuts */
  @state()
  private showShortcuts = false;

  // Data fields
  /** Handles loading data from the JSON files */
  private loader = new DataLoader();
  /** All struct definitions in the game */
  private structs: StructEntryDict = {};
  /** All union definitions in the game */
  private unions: UnionEntryDict = {};
  /** All enum definitions in the game */
  private enums: EnumEntryDict = {};
  /** Sizes of structs, unions, and typedefs */
  private sizes: { [key: string]: number } = {};
  /** All map data for game and region */
  private allData: NamedEntry[] = [];

  // UI fields
  private tableType: TableType = getMainTableType(this.map);
  private filter: string = '';
  private filterItems: FilterItem[] = [];
  private searchStructsUnions: boolean = false;
  private searchEnums: boolean = false;
  private hiddenColumns: Set<string> = new Set<string>([KEY_CAT, KEY_DESC]);
  private pageSize: number = 1000;
  private pageIndex: number = 0;
  private pendingShortcut: string = '';
  private resetTimer: number | undefined = undefined;

  constructor() {
    super();
    this.parseUrlParams();
    this.fetchData(true, false);
    document.body.addEventListener('keydown', (e: Event) => this.handleKeyDown(e));
  }

  override firstUpdated() {
    this.setFilterText(this.filter);
  }

  protected override willUpdate(changedProperties: PropertyValues): void {
    const gameChanged = changedProperties.get('game') !== undefined;
    const mapChanged = changedProperties.get('map') !== undefined;
    const regionChanged = changedProperties.get('region') !== undefined;
    if (gameChanged || mapChanged || regionChanged) {
      if (mapChanged) {
        this.tableType = getMainTableType(this.map);
      }
      this.fetchData(false, regionChanged);
    }
  }

  private parseUrlParams() {
    // Check for game, region, and map
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
    // Check for filter
    const filter = params.get(URL_FILTER);
    if (filter) {
      this.filter = filter;
    }
    // Check for options
    const optStr = params.get(URL_OPTIONS);
    if (optStr) {
      const opts = optStr.split(',');
      this.searchStructsUnions = opts.includes(OPT_STRUCTS_UNIONS)
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
    // Check options
    const opts = [];
    if (this.searchStructsUnions) { opts.push(OPT_STRUCTS_UNIONS); }
    if (this.searchEnums) { opts.push(OPT_ENUMS); }
    if (opts.length > 0) {
      params.set(URL_OPTIONS, opts.join(','));
    }
    const url = window.location.pathname + '?' + params.toString();
    window.history.replaceState(null, '', url);
  }

  async fetchData(first: boolean, keepFilter: boolean) {
    if (!this.game || !this.region || !this.map) {
      return;
    }

    if (!first && !keepFilter) {
      this.clearFilter();
    }

    this.fetchingData = true;

    const { gameData, entries } = await this.loader.load(
      this.game, this.region, this.map, this.tableType);

    this.structs = gameData.structs;
    this.unions = gameData.unions;
    this.enums = gameData.enums;
    this.sizes = gameData.sizes;
    this.allData = entries;

    this.filterData = this.allData;

    // Check if loading page with filter
    if ((first || keepFilter) && this.filter) {
      this.applyFilter();
    }

    if (!first) {
      this.pageIndex = 0;
      this.setUrlParams();
    }

    this.fetchingData = false;
  }

  private handleKeyDown(e: Event) {
    // Check to clear filter
    const key = (e as KeyboardEvent).key;
    if (key === 'Escape') {
      if (this.showShortcuts) {
        this.showShortcuts = false;
      } else {
        this.resetFilter();
      }
      return;
    }
    // Ignore keys when typing a filter
    const el = this.shadowRoot!.activeElement as HTMLElement;
    if (el?.matches("input, textarea, [contenteditable='true']")) {
      return;
    }
    // Check to toggle keyboard shortcuts pop-up
    if (key === '?') {
      this.showShortcuts = !this.showShortcuts;
      return;
    }
    // Check shortcuts to switch between game, map, and region
    if (!this.pendingShortcut) {
      if (key === 'g' || key === 'm' || key === 'r') {
        this.pendingShortcut = key;
        clearTimeout(this.resetTimer);
        this.resetTimer = window.setTimeout(() => this.pendingShortcut = '', 1500);
      }
    } else {
      if (this.pendingShortcut === 'g') {
        const game = GAME_SHORTCUTS[key];
        if (game) {
          this.game = game;
        }
      } else if (this.pendingShortcut === 'm') {
        const map = MAP_SHORTCUTS[key];
        if (map) {
          this.map = map;
        }
      } else if (this.pendingShortcut === 'r') {
        const region = REGION_SHORTCUTS[key];
        if (region) {
          this.region = region;
        }
      }
      this.pendingShortcut = '';
      clearTimeout(this.resetTimer);
    }
  }

  private filterKeyUp(e: Event) {
    let ke = (e as KeyboardEvent);
    if (ke.key === 'Enter') {
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

  private applyFilter() {
    this.filterItems = FilterParser.parse(this.filter);
    this.pageIndex = 0;
    const engine = new FilterEngine({
      tableType: this.tableType,
      structs: this.structs,
      unions: this.unions,
      enums: this.enums,
      sizes: this.sizes,
      searchStructsUnions: this.searchStructsUnions,
      searchEnums: this.searchEnums,
    });
    this.filterData = engine.apply(this.allData, this.filterItems);
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
    this.filterItems = [];
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
    this.searchStructsUnions = cb.checked;
  }

  private enumsChangeHandler() {
    const cb = this.shadowRoot?.querySelector('#filter-enums') as HTMLInputElement;
    this.searchEnums = cb.checked;
  }

  private gameChangeHandler() {
    this.game =
      (this.shadowRoot!.querySelector('#game-select')! as HTMLInputElement)
        .value;
  }

  private regionChangeHandler() {
    this.region =
      (this.shadowRoot!.querySelector('#region-select')! as HTMLInputElement)
        .value;
  }

  private mapChangeHandler() {
    const map =
      (this.shadowRoot!.querySelector('#map-select')! as HTMLInputElement)
        .value;
    this.setMapType(map);
  }

  private setMapType(map: string) {
    this.map = map;
    this.tableType = getMainTableType(map);
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
      // Row info
      const numRows = this.filterData.length;
      const firstRow = this.pageIndex * this.pageSize + 1;
      const lastRow = Math.min(firstRow + this.pageSize - 1, numRows);
      // Page info
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
    const highlightRegex = FilterEngine.highlightRegex(this.filterItems);
    return html`<map-table
      .tableType="${this.tableType}"
      .githubUrl="${GITHUB_URLS[this.game]}"
      .entries="${this.filterData.slice(firstRow, lastRow)}"
      .structs="${this.structs}"
      .unions="${this.unions}"
      .enums="${this.enums}"
      .sizes="${this.sizes}"
      .hiddenColumns="${this.hiddenColumns}"
      .highlightRegex="${highlightRegex}">
    </map-table>`;
  }

  override render() {
    return html`
      <div id="page">
        <h1>GBA Metroid Data Maps</h1>
        <div id="banner">
          <div id="options">
            <div id="selectors">
              <select id="game-select" .value=${this.game} @change="${this.gameChangeHandler}">
                ${GAMES.map(game => html`<option value="${game.value}" ?selected="${this.game == game.value}">${game.name}</option>`)}
              </select>
              <select id="map-select" .value=${this.map} @change="${this.mapChangeHandler}">
                ${MAPS.map(map => html`<option value="${map.value}" ?selected="${this.map == map.value}">${map.name}</option>`)}
              </select>
              <select id="region-select" .value=${this.region} @change="${this.regionChangeHandler}">
                ${REGIONS.map(reg => html`<option value="${reg}" ?selected="${this.region == reg}">${reg}</option>`)}
              </select>
            </div>
            <div id="filter">
              <div id="filter-search">
                Filter:
                <input class="search-box" @keyup='${this.filterKeyUp}'/>
              </div>
              <div>
                <button @click="${this.userApplyFilter}">Apply</button>
                <button @click="${this.resetFilter}">Reset</button>
                <button @click="${this.collapseAll}">Collapse All</button>
              </div>
            </div>
            <ul id="filter-options" class="checkbox-list">
              <li title="Include struct/union info when filtering">
                <input type="checkbox" id="filter-structs"
                  .checked=${this.searchStructsUnions}
                  @change='${this.structsChangeHandler}'>
                <label for="filter-structs">Structs/Unions</label>
              </li>
              <li title="Include enum info when filtering">
                <input type="checkbox" id="filter-enums"
                  .checked=${this.searchEnums}
                  @change='${this.enumsChangeHandler}'>
                <label for="filter-enums">Enums</label>
              </li>
            </ul>
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
          ${this.renderPageNav()}
        </div>
        ${this.renderTable()}
        <map-shortcuts .open="${this.showShortcuts}"
          @close="${() => this.showShortcuts = false}"></map-shortcuts>
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'map-app': MapApp;
  }
}
