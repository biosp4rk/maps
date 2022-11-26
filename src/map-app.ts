import { css, customElement, html, LitElement, property } from 'lit-element';
import { TableType } from "./map-table";
import { GameStructList, GameEnumList, GameStruct } from './entry-types';
import { getHideableColumns } from './headings'

const VERSIONS = ['U', 'E', 'J'];

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

const MAPS = [
  {
    label: 'RAM',
    value: 'ram',
  },
  {
    label: 'ROM Code',
    value: 'code',
  },
  {
    label: 'ROM Data',
    value: 'data',
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
      margin: 5px 0;
    }

    .search-box {
      position: relative;
      display: inline-block;
      box-sizing: border-box;
      width: 170px;
      /* 170 - 115 left position below */
      padding-right: 55px;
    }

    .curr-page {
      margin-right: 8px;
    }
    .page-num {
      cursor: pointer;
      color: #A0A0E0;
      margin-right: 8px;
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
      grid-column: 1;
      grid-row: 1;
    }
    #search {
      grid-column: 1;
      grid-row: 2;
    }
    #page-nav {
      grid-column: 1;
      grid-row: 3;
    }
    #column-vis {
      grid-column: 2;
      grid-row: 1 / 5;
      text-align: left;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    #page-nav {
      text-align: center;
    }
    #num-rows {
      margin-right: 10px;
    }
    #page-text {
      margin-left: 10px;
    }

    #main-table {
      table-layout: fixed;
      margin: auto;
      max-width: 95%;
    }
  `;

  /** ? */
  @property({ type: Object }) structs: GameStructList = {};
  /** ? */
  @property({ type: Object }) enums: GameEnumList = {};
  /** ? */
  @property({ type: Array }) data: Array<{ [key: string]: unknown }> = [];
  /** ? */
  @property({ type: Number }) resultIndex = 0;
  /** ? */
  @property({ type: Number }) resultCount = 0;
  /** ? */
  @property({ type: String }) game = 'mf';
  /** ? */
  @property({ type: String }) version = 'U';
  /** ? */
  @property({ type: String }) map = 'ram';
  /** ? */
  @property({ type: Boolean }) fetchingData = false;

  private pageSize: number = 1000;
  private pageIndex: number = -1;


  query = '';
  generator: Generator<{ row: number[], key: string }, void, unknown> | undefined =
    undefined;
  seenResults: Array<{ row: number[], key: string }> = [];

  constructor() {
    super();
    this.parseUrlSearchParams();
    this.fetchData();
    document.body.addEventListener('keyup', (e: Event) => {
      if ((e as KeyboardEvent).key == 'Escape') {
        this.clearPrevHighlight();
      }
    })
  }

  private parseUrlSearchParams() {
    // check for game, version, and map in search params
    const params = new URLSearchParams(window.location.search);
    const game = params.get('game') || '';
    if (GAMES.some(x => x.value === game)) {
      this.game = game;
    }
    const version = params.get('version')?.toUpperCase() || '';
    if (VERSIONS.includes(version)) {
      this.version = version;
    }
    const map = params.get('map') || '';
    if (MAPS.some(x => x.value === map)) {
      this.map = map;
    }
  }

  private getVersionEntry(entry: { [key: string]: unknown }) {
    if (typeof entry.addr == 'object') {
      const addrs = entry.addr as { [key: string]: string };
      if (this.version in addrs) {
        entry.addr = addrs[this.version]
      } else {
        entry.addr = null;
      }
    }
    // functions may have different sizes
    if (typeof entry.size == 'object') {
      const sizes = entry.size as { [key: string]: string };
      if (this.version in sizes) {
        entry.size = sizes[this.version]
      } else {
        entry.addr = null;
      }
    }
  }

  async fetchData() {
    if (!this.game || !this.version || !this.map) {
      return;
    }
    // read data from json files
    this.fetchingData = true;
    const targetBaseUrl = `/json/${this.game}/`;

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
    fullData.forEach(entry => this.getVersionEntry(entry));
    this.data = fullData.filter(entry => entry.addr !== null);
    
    this.pageIndex = 0;
    this.fetchingData = false;
  }

  private inputHandler(e: Event) {
    let ke = (e as KeyboardEvent);
    if (ke.key == 'Enter') {
      this.performSearch(
        this.shadowRoot?.querySelector('input')!.value || '', !ke.shiftKey);
    }
  }

  private findHandler() {
    this.performSearch(this.shadowRoot?.querySelector('input')!.value || '');
  }

  private clearPrevSearch() {
    this.query = '';
    this.generator = undefined;
    this.resultIndex = 0;
    this.resultCount = 0;
    this.seenResults = [];
    this.shadowRoot!.querySelector('input')!.value = '';
    this.clearPrevHighlight();
  }

  private clearPrevHighlight() {
    //this.shadowRoot!.querySelector('map-table')!.clearHighlights();
  }

  private collapseAll() {
    this.shadowRoot?.querySelector('map-table')!.collapseAll();
  }

  private async performSearch(query: string, forward = true) {
    if (!query) {
      return;
    }

    this.clearPrevHighlight();
    if (query != this.query) {
      this.query = query;
      this.resultIndex = 0;
      //this.generator = this.search(query, this.data, []);
      this.seenResults = [];
    }
    if (!forward && this.seenResults.length && this.resultIndex > 0) {
      // go backwards to previous result
      this.resultIndex = this.resultIndex - 1;
      //let result = this.seenResults[this.resultIndex - 1];
      //this.shadowRoot?.querySelector('map-table')!.highlight(result);
      await Promise.resolve();
      return;
    }
    if (this.resultIndex < this.seenResults.length) {
      // go forwards through already generated results
      this.resultIndex++;
      //let result = this.seenResults[this.resultIndex - 1];
      //this.shadowRoot?.querySelector('map-table')!.highlight(result);
      await Promise.resolve();
      return;
    }
    const result = this.generator!.next().value;
    if (!result) {
      this.query = '';
      this.generator = undefined;
      this.resultIndex = 0;
      this.resultCount = 0;
      return;
    }
    // deep copy of object with array
    let storage = Object.assign({}, result);
    storage.row = storage.row.slice();
    this.seenResults.push(storage);
    this.resultIndex = this.resultIndex + 1;
    // highlight that result
    //this.shadowRoot?.querySelector('map-table')!.highlight(result);
  }

  private getRenderedResultsCount(resultIndex: number, resultCount: number) {
    return resultIndex ? resultIndex + ' of ' + resultCount : ''
  }

  private gameChangeHandler() {
    this.game =
      (this.shadowRoot!.querySelector('#game-select')! as HTMLInputElement)
        .value;
    this.clearPrevSearch();
    this.fetchData();
  }

  private versionChangeHandler() {
    this.version =
      (this.shadowRoot!.querySelector('#version-select')! as HTMLInputElement)
        .value;
    this.clearPrevSearch();
    this.fetchData();
  }

  private mapChangeHandler() {
    // ram, code, data
    this.map =
      (this.shadowRoot!.querySelector('#map-select')! as HTMLInputElement)
        .value;
    this.clearPrevSearch();
    this.fetchData();
  }

  private toggleColumn(event: any) {
    const colName = event.target.id;
    const visible = event.target.checked;
    this.shadowRoot?.querySelector('map-table')!.toggleColumn(colName, visible);
    this.render();
  }

  private pageNumClicked(event: any) {
    const idx = parseInt(event.target.innerText) - 1;
    if (idx !== this.pageIndex) {
      this.pageIndex = idx;
      this.requestUpdate();
    }
  }

  private renderPageNav() {
    // row info
    const numRows = this.data.length;
    const firstRow = this.pageIndex * this.pageSize + 1;
    const lastRow = Math.min(firstRow + this.pageSize - 1, numRows);
    // page info
    const numPages = Math.ceil(numRows / this.pageSize);
    const pages = [...Array(numPages).keys()];
    return html`
      <div id="page-nav">
        <span id="num-rows">${firstRow}-${lastRow} of ${numRows}</span>
        <span id="page-text">Page:</span>
        ${pages.map(p => html`
          <span class="${p === this.pageIndex ? 'curr-page' : 'page-num'}"
            @click="${this.pageNumClicked}">${p + 1}</span>`)}
      </div>`;
  }

  private getTableType(): TableType {
    switch(this.map) {
      case 'ram': return TableType.RamList;
      case 'data': return TableType.DataList;
      case 'code': return TableType.CodeList;
      default: return TableType.None;
    }
  }

  private renderTable() {
    if (this.fetchingData) {
      return '';
    }
    const firstRow = this.pageIndex * this.pageSize + 1;
    const lastRow = firstRow + this.pageSize;
    return html`<map-table id="main-table"
      .tableType="${this.getTableType()}"
      .version="${this.version}"
      .data="${this.data.slice(firstRow, lastRow)}"
      .structs="${this.structs}"
      .enums="${this.enums}">
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
              <select id="version-select" @change="${this.versionChangeHandler}">
                ${VERSIONS.map(ver => html`<option value="${ver}" ?selected="${this.version == ver}">${ver}</option>`)}
              </select>
            </div>
            <div id="search">
              Search:
              <label class="search-box" data-results="${this.getRenderedResultsCount(
                this.resultIndex, this.resultCount)}">
                <input class="search-box" @keyup='${this.inputHandler}'/>
              </label>
              <button @click="${this.findHandler}">Find</button>
              <button @click="${this.clearPrevSearch}">Reset</button>
              <button @click="${this.collapseAll}">Collapse All</button>
            </div>
            ${this.renderPageNav()}
            <ul id="column-vis">
              ${getHideableColumns(this.map).map(
                col => html`<li>
                  <input type="checkbox" id="${col.key}" checked
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
