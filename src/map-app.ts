import { LitElement, html, css } from 'lit';
import { state, customElement } from 'lit/decorators.js';
import {
  GAMES, MAPS, TableType, REGIONS, KEY_CAT, KEY_NAME, KEY_DESC,
  getMainTableType, getHideableColumns
} from './constants';
import {
  DictEntry, NamedEntry, StructEntryDict, UnionEntryDict, EnumEntryDict, TypedefEntryDict,
  DataEntry, CodeEntry,  StructEntry, UnionEntry, EnumEntry, TypedefEntry
} from './info-entry';
import { FilterItem, FilterParser, FilterType } from './filter-parser';
import "./map-table";
import { TypeSpecKind, AssetType, SpecifierType, PointerType, ArrayType, FunctionType } from './asset-type';

const VERSION = 6;

const GIT_COMMIT_MF = '47234f39e85ccefecd5d5125d9a711fa726b1a2c';
const GIT_COMMIT_ZM = '72a40125ad9e1b790e967c8fe053bf6fc86c3fab';

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

const BUILT_IN_SIZES: { [key: string]: number } = {
  ["char"]: 1,
  ["short"]: 2,
  ["int"]: 4,
  ["float"]: 4,
  ["double"]: 8
};

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

  // Data fields
  /** All struct definitions in the game */
  private structs: StructEntryDict = {};
  /** All union definitions in the game */
  private unions: UnionEntryDict = {};
  /** All enum definitions in the game */
  private enums: EnumEntryDict = {};
  /** All typedefs in the game */
  private typedefs: TypedefEntryDict = {};
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

  constructor() {
    super();
    this.parseUrlParams();
    this.fetchData(true, true, false);
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
    // Data may have different counts
    if (typeof entry.count == 'object') {
      const counts = entry.count as { [key: string]: string };
      if (this.region in counts) {
        entry.count = counts[this.region]
      }
    }
    // Functions may have different sizes
    if (typeof entry.size == 'object') {
      const sizes = entry.size as { [key: string]: string };
      if (this.region in sizes) {
        entry.size = sizes[this.region]
      }
    }
  }

  private getJsonUrl(jsonName: string): string {
    const baseUrl = `/json/${this.game}/`;
    const fileName = jsonName + '.json';
    const ver = '?v=' + VERSION;
    return baseUrl + fileName + ver;
  }

  async fetchData(first: boolean, gameChanged: boolean, keepFilter: boolean) {
    if (!this.game || !this.region || !this.map) {
      return;
    }
    
    if (!first && !keepFilter) {
      this.clearFilter();
    }

    // Read data from json files
    this.fetchingData = true;
    const promises = [];

    if (first || gameChanged) {
      promises.push(
        fetch(this.getJsonUrl('structs')),
        fetch(this.getJsonUrl('unions')),
        fetch(this.getJsonUrl('enums')),
        fetch(this.getJsonUrl('typedefs'))
      );
    }

    if (this.tableHasAddr()) {
      promises.push(fetch(this.getJsonUrl(this.map)));
    }

    const responses = await Promise.all(promises);
    const jsons = await Promise.all(responses.map(r => r.json()));

    if (first || gameChanged) {
      const [structJson, unionJson, enumJson, typedefJson] = jsons;

      // Get structs
      this.structs = {};
      for (const entry of structJson) {
        this.structs[entry[KEY_NAME]] = new StructEntry(entry);
      }
      // Get unions
      this.unions = {};
      for (const entry of unionJson) {
        this.unions[entry[KEY_NAME]] = new UnionEntry(entry);
      }
      // Get enums
      this.enums = {};
      for (const entry of enumJson) {
        let name = entry[KEY_NAME] as string;
        // Strip trailing underscore
        name = name.endsWith('_') ? name.slice(0, -1) : name
        entry[KEY_NAME] = name;
        this.enums[name] = new EnumEntry(entry);
      }
      // Get typedefs
      this.typedefs = {};
      for (const entry of typedefJson) {
        this.typedefs[entry[KEY_NAME]] = new TypedefEntry(entry);
      }

      // Compute sizes
      this.sizes = {};
      for (const entry of Object.values(this.structs)) {
        this.sizes[entry.name] = entry.size;
      }
      for (const entry of Object.values(this.unions)) {
        this.sizes[entry.name] = entry.size;
      }
      for (const entry of Object.values(this.typedefs)) {
        if (!(entry.name in this.sizes)) {
          this.sizes[entry.name] = this.typeSize(entry.type);
        }
      }
    }

    // Get map data
    if (this.tableHasAddr()) {
      // Ram, code, or data
      let fullData: DictEntry[] = jsons.pop();
      // Filter by region
      fullData.forEach(entry => this.getRegionEntry(entry));
      fullData = fullData.filter(entry => entry.addr !== null);
      // Convert to classes
      if (this.tableIs(TableType.CodeList)) {
        this.allData = fullData.map(entry => new CodeEntry(entry));
      } else {
        this.allData = fullData.map(entry => new DataEntry(entry));
      }
    } else {
      // Structs, unions, enums, or typedefs
      let entries;
      switch (this.tableType) {
        case TableType.StructList:
          entries = this.structs;
          break;
        case TableType.UnionList:
          entries = this.unions;
          break;
        case TableType.EnumList:
          entries = this.enums;
          break;
        case TableType.TypedefList:
          entries = this.typedefs;
          break;
        default:
          throw new Error(`Invalid table type ${this.tableType}`);
      }
      this.allData = Object.values(entries).sort((a, b) => {
        if (a.name < b.name) { return -1; }
        if (a.name > b.name) { return 1; }
        return 0;
      });
    }

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

  /** Computes the size of types for the purpose of storing typedef sizes */
  private typeSize(type: AssetType): number {
    if (type instanceof SpecifierType) {
      const name = type.specName();
      switch (type.kind) {
        case TypeSpecKind.BuiltIn:
          if (type.names.includes("long")) {
            return 8;
          }
          const size = BUILT_IN_SIZES[name];
          if (size !== undefined) {
            return size;
          }
          return 4; // int by default
        case TypeSpecKind.Typedef:
          const td = this.typedefs[name];
          if (td !== undefined) {
            let size = this.sizes[td.name];
            if (size === undefined) {
              size = this.typeSize(td.type);
              this.sizes[td.name] = size;
            }
            return size;
          } else {
            throw new Error(`Unrecognized typedef name ${name}`);
          }
        case TypeSpecKind.Struct:
          return this.sizes[name];
        case TypeSpecKind.Union:
          return this.sizes[name];
        case TypeSpecKind.Enum:
          throw new Error(`Can't compute size of enum`);
        default:
          throw new Error(TypeSpecKind[type.kind]);
      }
    } else if (type instanceof ArrayType) {
      if (type.size === undefined) {
        return 0; // Treat 0 as unknown
      }
      return type.size * this.typeSize(type.innerType);
    } else if (type instanceof PointerType) {
      return 4;
    } else if (type instanceof FunctionType) {
      throw new Error('Function types must be pointer');
    } else {
      throw new Error(`Invalid type ${typeof(type)}`);
    }
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

  private checkNameFilter(
    name: string,
    item: FilterItem,
    structUnionName: string = '',
    enumName: string = '',
    seenParents: Set<string> = new Set<string>()
  ): boolean {
    if (seenParents.has(structUnionName)) {
      return false;
    }
    name = name.toLowerCase();
    if (item.type === FilterType.Term) {
      if (name.includes(item.term) !== item.exclude) {
        return true;
      }
    } else if (item.type === FilterType.Regex) {
      if (item.regex!.test(name) !== item.exclude) {
        return true;
      }
    }
    // Check if entry is struct or union
    if (this.searchStructsUnions && structUnionName) {
      let suEntry = undefined;
      if (structUnionName in this.structs) {
        suEntry = this.structs[structUnionName];
      } else if (structUnionName in this.unions) {
        suEntry = this.unions[structUnionName];
      }
      if (suEntry) {
        seenParents.add(structUnionName);
        if (suEntry.vars.some(
          su => this.checkNameFilter(su.name, item, su.specName(), su.enum, seenParents))
        ) {
          return true;
        }
      }
    }
    // Check if entry has enum
    if (this.searchEnums && enumName && enumName in this.enums) {
      const ee = this.enums[enumName].vals;
      if (ee.some(ev => this.checkNameFilter(ev.name, item))) {
        return true;
      }
    }
    // Did not match name, struct var, or enum val
    return false;
  }

  private checkAddrFilter(addr: number, item: FilterItem): boolean {
    switch (item.type) {
      case FilterType.AddrEQ:
        if ((addr === item.addr!) !== item.exclude) {
          return true;
        }
        break;
      case FilterType.AddrGT:
        if ((addr > item.addr!) !== item.exclude) {
          return true;
        }
        break;
      case FilterType.AddrLT:
        if ((addr < item.addr!) !== item.exclude) {
          return true;
        }
        break;
      case FilterType.AddrGE:
        if ((addr >= item.addr!) !== item.exclude) {
          return true;
        }
        break;
      case FilterType.AddrLE:
        if ((addr <= item.addr!) !== item.exclude) {
          return true;
        }
        break;
    }
    return false;
  }

  private handleNearAddrFilter(item: FilterItem) {
    const target = item.addr!
    // Find index of first entry past address using binary search
    const numEntries = this.filterData.length;
    let low = 0;
    let high = numEntries;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.filterData[mid].sortValue() > target) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    const idx = low;
    // Check if exact match
    let exact = false;
    if (idx - 1 >= 0) {
      let addr;
      let size;
      const entry = this.filterData[idx - 1];
      if (this.tableIs(TableType.CodeList)) {
        const ce = entry as CodeEntry;
        addr = ce.addr
        size = ce.size;
      } else {
        const de = entry as DataEntry;
        addr = de.addr;
        size = de.getLength(this.sizes);
      }
      if (target >= addr && target < addr + size) {
        exact = true;
      }
    }
    // Get left/right entries
    let left = idx - 1;
    if (exact) { left--; }
    if (left < 0) { left = 0; }
    let right = idx;
    if (right >= numEntries) {
      right = numEntries - 1;
    }
    this.filterData = this.filterData.slice(left, right + 1);
  }

  private getHighlightRegex(): RegExp | null {
    const highlightItems = this.filterItems.filter(
      item =>
        (item.type === FilterType.Term || item.type === FilterType.Regex) &&
        !item.exclude);
    if (highlightItems.length === 0) {
      return null;
    }
    return new RegExp(highlightItems.map(i => i.term).join('|'), 'gi');
  }

  private applyFilter() {
    // Parse to get filter items
    this.filterItems = FilterParser.parse(this.filter);
    this.pageIndex = 0;

    // Check each filter item
    this.filterData = this.allData;
    for (const item of this.filterItems) {
      switch (item.type) {
        case FilterType.Term:
        case FilterType.Regex:
          this.filterData = this.filterData.filter(entry => {
            let suName = undefined;
            let eName = undefined;
            if (this.tableIs(TableType.RamList, TableType.DataList)) {
              const de = entry as DataEntry;
              if (this.searchStructsUnions &&
                (de.specKind === TypeSpecKind.Struct || de.specKind === TypeSpecKind.Union)) {
                suName = de.specName();
              }
              if (this.searchEnums) {
                eName = de.enum;
              }
            } else if (this.tableIs(TableType.StructList) && this.searchStructsUnions) {
              const se = entry as StructEntry;
              suName = se.name;
            } else if (this.tableIs(TableType.EnumList) && this.searchEnums) {
              const ee = entry as EnumEntry;
              eName = ee.name;
            }
            return this.checkNameFilter(entry.name, item, suName, eName);
          });
          break;
        case FilterType.AddrEQ:
        case FilterType.AddrGT:
        case FilterType.AddrLT:
        case FilterType.AddrGE:
        case FilterType.AddrLE:
          if (this.tableHasAddr()) {
            this.filterData = this.filterData.filter(entry => {
              return this.checkAddrFilter(entry.sortValue(), item);
            });
          } else {
            this.filterData = [];
          }
          break;
        case FilterType.AddrNear:
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
    this.fetchData(false, true, false);
  }

  private regionChangeHandler() {
    this.region =
      (this.shadowRoot!.querySelector('#region-select')! as HTMLInputElement)
        .value;
    this.fetchData(false, false, true);
  }

  private mapChangeHandler() {
    const map =
      (this.shadowRoot!.querySelector('#map-select')! as HTMLInputElement)
        .value;
    this.setMapType(map);
    this.fetchData(false, false, false);
  }

  private setMapType(map: string) {
    this.map = map;
    this.tableType = getMainTableType(map);
  }

  private tableIs(...tableTypes: TableType[]): boolean {
    return tableTypes.includes(this.tableType);
  }

  private tableHasAddr(): boolean {
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
    const highlightRegex = this.getHighlightRegex();
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
              <select id="game-select" @change="${this.gameChangeHandler}">
                ${GAMES.map(game => html`<option value="${game.value}" ?selected="${this.game == game.value}">${game.name}</option>`)}
              </select>
              <select id="map-select" @change="${this.mapChangeHandler}">
                  ${MAPS.map(map => html`<option value="${map.value}" ?selected="${this.map == map.value}">${map.name}</option>`)}
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
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'map-app': MapApp;
  }
}
