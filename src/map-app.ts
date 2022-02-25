import { css, customElement, html, LitElement, property } from 'lit-element';

/**
 * Renders the application.
 */
@customElement('map-app')
export class MapApp extends LitElement {
  static override styles = css`
    :host {
      display: block;
      background-image: url("background.png");
      color: white;
      font-family: verdana, sans-serif;
    }

    h1 {
      text-align: center;
      background: #202020;
      margin: 0;
    }

    #page {
      padding-bottom: 30px
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

    button,
    input,
    select {
      background: black;
      color: white;
    }

    label,
    input {
      position: relative;
      display: inline-block;
      box-sizing: border-box;
      width: 170px;
      /** 170 - 115 left position below */
      padding-right: 55px;
    }

    label::after {
      content: attr(data-results);
      position: absolute;
      top: 4px;
      right: 4px;
      font-family: verdana, sans-serif;
      font-size: 12px;
      display: block;
      font-weight: bold;
    }
  `;

  @property({ type: Object }) enums: { [key: string]: unknown } = {};

  @property({ type: Object }) structs: { [key: string]: unknown } = {};

  @property({ type: Array }) data: Array<{ [key: string]: unknown }> = [];

  @property({ type: Number }) resultCount = 0;

  @property({ type: Number }) totalResults = 0;

  @property({ type: Boolean }) noResults = false;

  @property({ type: String }) game = 'mf';

  @property({ type: String }) version = 'U';

  @property({ type: String }) map = 'ram';

  @property({ type: Boolean }) fetchingData = false;

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
        this.clearPreviousSearch(false);
      }
    })
  }

  private parseUrlSearchParams() {
    // check for game, version, and map in search params
    const params = new URLSearchParams(window.location.search);
    const game = params.get('game') || '';
    if (this.getGames().some(x => x.value === game)) {
      this.game = game;
    }
    const version = params.get('version')?.toUpperCase() || '';
    if (this.getVersions().includes(version)) {
      this.version = version;
    }
    const map = params.get('map') || '';
    if (this.getMaps().some(x => x.value === map)) {
      this.map = map;
    }
  }

  private getVersionedData() {
    return this.data.filter(
      (item: { [key: string]: unknown }) =>
        typeof item.addr == 'string' ||
        this.version in (item.addr as { [key: string]: string }));
  }

  private getVersions() {
    return ['U', 'E', 'J'];
  }

  async fetchData() {
    if (!this.game || !this.version || !this.map) {
      return;
    }
    this.fetchingData = true;
    const targetBaseUrl = `/json/${this.game}/`;
    this.enums = await fetch(targetBaseUrl + 'enums.json')
      .then(response => response.json());
    this.structs = await fetch(targetBaseUrl + 'structs.json')
      .then(response => response.json());
    this.data = await fetch(targetBaseUrl + `${this.map}.json`)
      .then(response => response.json());
    this.fetchingData = false;
  }

  private inputHandler(e: Event) {
    let ke = (e as KeyboardEvent);
    if (ke.key == 'Enter') {
      this.performSearch(
        this.shadowRoot?.querySelector('input')!.value || '', !ke.shiftKey);
    }
  }

  private searchButtonHandler() {
    this.performSearch(this.shadowRoot?.querySelector('input')!.value || '');
  }

  private findAllButtonHandler() {
    this.findAll(this.shadowRoot?.querySelector('input')!.value || '');
  }

  private findAll(query: string, highlight = true) {
    this.clearPreviousSearch(false);
    const gen = this.search(query, this.getVersionedData(), []);
    let result = gen.next().value;
    let resultCount = 0;
    while (result) {
      resultCount++;
      if (highlight) {
        this.shadowRoot?.querySelector('map-table')!.highlight(
          result, resultCount == 1);
      }
      result = gen.next().value;
    }
    if (highlight && resultCount) {
      this.resultCount = 1;
      this.totalResults = resultCount;
    }
    return resultCount;
  }

  private clearPreviousSearch(clearInput: boolean = true) {
    if (clearInput) {
      this.shadowRoot!.querySelector('input')!.value = '';
      this.resultCount = 0;
      this.totalResults = 0;
      this.seenResults = [];
    }
    this.noResults = false;
    this.shadowRoot!.querySelector('map-table')!.clearHighlights();
  }

  private collapseAll() {
    this.shadowRoot?.querySelector('map-table')!.collapseAll();
  }

  private async performSearch(query: string, forward = true) {
    if (!query) {
      return;
    }

    this.clearPreviousSearch(false);
    if (query != this.query) {
      this.query = query;
      this.resultCount = 0;
      this.totalResults = this.findAll(query, false);
      this.generator = this.search(query, this.getVersionedData(), []);
      this.seenResults = [];
    }
    if (!forward && this.seenResults.length && this.resultCount > 0) {
      // go backwards to previous result
      this.resultCount = this.resultCount - 1;
      let result = this.seenResults[this.resultCount - 1];
      this.shadowRoot?.querySelector('map-table')!.highlight(result);
      await Promise.resolve();
      return;
    }
    if (this.resultCount < this.seenResults.length) {
      // forwards through already generated results
      this.resultCount++;
      let result = this.seenResults[this.resultCount - 1];
      this.shadowRoot?.querySelector('map-table')!.highlight(result);
      await Promise.resolve();
      return;
    }
    const result = this.generator!.next().value;
    if (!result) {
      // if there were never any results, note that
      if (!this.resultCount) {
        this.noResults = true;
      }
      this.query = '';
      this.generator = undefined;
      this.resultCount = 0;
      this.totalResults = 0;
      return;
    }
    // Fuck deep copies of objects with arrays.
    let storage = Object.assign({}, result);
    storage.row = storage.row.slice();
    this.seenResults.push(storage);
    this.resultCount = this.resultCount + 1;
    // highlight that result
    this.shadowRoot?.querySelector('map-table')!.highlight(result);
  }

  *search(
    query: string, data: Array<{ [key: string]: unknown }>,
    rowStart: number[]): Generator<{ row: number[], key: string }> {
    for (let i = 0; i < data.length; i++) {
      let row = data[i] as { [key: string]: unknown };
      let keys = Object.keys(row);
      // Remove "label" since it's not shown to users.
      let indexLabel = keys.findIndex((v) => v == 'label');
      if (indexLabel != -1) {
        keys.splice(indexLabel, 1);
      }
      // Remove "enum" since the values aren't shown to users.
      indexLabel = keys.findIndex((v) => v == 'enum');
      if (indexLabel != -1) {
        keys.splice(indexLabel, 1);
      }
      // Remove 'type' key matches, since those point to structs.
      indexLabel = keys.findIndex((v) => v == 'type');
      if (indexLabel != -1) {
        keys.splice(indexLabel, 1);
      }

      rowStart.push(i);
      for (let j = 0; j < keys.length; j++) {
        let thisKey = keys[j];
        let searchable = (row[(thisKey as string)] as string);
        if (!searchable && ['params', 'return'].includes(thisKey)) {
          searchable = 'void';
        }
        if (thisKey == 'params' && Array.isArray(row[(thisKey)])) {
          // Params is actually an array, but we render it as
          // a single cell, so go ahead and re-join it to
          // search over the string.
          searchable = (searchable as unknown as string[]).join(',');
        }
        if ((thisKey == 'size' && typeof row[thisKey] == 'object') ||
          (thisKey == 'count' && typeof row[thisKey] == 'object') ||
          thisKey == 'addr') {
          searchable =
            (searchable as unknown as
              ({ [key: string]: string }))[this.version];
        }
        if (searchable.toLowerCase().indexOf(query.toLowerCase()) != -1) {
          // This has the search term!
          yield { row: rowStart, key: thisKey };
        }
        if (thisKey == 'desc' &&
          ('enum' in row || row.type as string in this.structs)) {
          let isEnum = 'enum' in row;
          let expandName = isEnum ? row.enum as string : row.type as string;
          if (isEnum) {
            yield*
              this.search(
                query,
                this.enums[expandName] as Array<{ [key: string]: unknown }>,
                rowStart);
          } else {
            yield*
              this.search(
                query,
                (this.structs[expandName] as { [key: string]: unknown })
                  .vars as Array<{ [key: string]: unknown }>,
                rowStart);
          }
        }
      }
      rowStart.pop();
    }
  }

  private getGames() {
    return [
      {
        label: 'Metroid Fusion',
        value: 'mf',
      },
      {
        label: 'Metroid Zero Mission',
        value: 'zm',
      },
    ];
  }

  private getMaps() {
    return [
      {
        label: 'RAM',
        value: 'ram',
      },
      {
        label: 'ROM Code',
        value: 'code',
      },
      {
        label: 'Sprite AI',
        value: 'sprite_ai',
      },
      {
        label: 'ROM Data',
        value: 'data',
      },
    ];
  }

  private getRenderedResultsCount(
    resultCount: number, totalResults: number, noResults: boolean) {
    if (noResults) {
      // Render 0 of 0
      return resultCount + ' of ' + totalResults;
    }
    return resultCount ? resultCount + ' of ' + totalResults : ''
  }

  private gameChangeHandler() {
    // mf, zm
    this.game =
      (this.shadowRoot!.querySelector('#game-select')! as HTMLInputElement)
        .value;
    this.fetchData();
  }

  private versionChangeHandler() {
    // U, E, J
    this.version =
      (this.shadowRoot!.querySelector('#version-select')! as HTMLInputElement)
        .value;
  }

  private mapChangeHandler() {
    // ram, code, sprite_ai, data
    this.map =
      (this.shadowRoot!.querySelector('#map-select')! as HTMLInputElement)
        .value;
    this.fetchData();
  }

  override render() {
    return html`
      <div id="page">
        <h1>GBA Metroid Data Maps</h1>
        <div id="banner">
          <p>
            <select id="game-select" @change="${this.gameChangeHandler}">
              ${this.getGames().map(game => html`<option value="${game.value}" ?selected="${this.game == game.value}">${game.label}</option>`)}
            </select>
            <select id="map-select" @change="${this.mapChangeHandler}">
                ${this.getMaps().map(map => html`<option value="${map.value}" ?selected="${this.map == map.value}">${map.label}</option>`)}
            </select>
            <select id="version-select" @change="${this.versionChangeHandler}">
              ${this.getVersions().map(version => html`<option value="${version}" ?selected="${this.version == version}">${version}</option>`)}
            </select>
          </p>
          <p>
            Search:
            <label data-results="${this.getRenderedResultsCount(
              this.resultCount, this.totalResults, this.noResults)}">
              <input @keyup='${this.inputHandler}'/>
            </label>
            <button @click="${this.searchButtonHandler}">Find</button>
            <button @click="${this.findAllButtonHandler}">Find All</button>
            <button @click="${this.clearPreviousSearch}">Clear Results</button>
            <button @click="${this.collapseAll}">Collapse All</button>
          </p>
        </div>
        ${!this.fetchingData ? html`
        <map-table id="first"
          .maptype="${this.map}"
          .version="${this.version}"
          .data="${this.data}"
          .structs="${this.structs}"
          .enums="${this.enums}">
        </map-table>
        ` :
        ''}
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'map-app': MapApp;
  }
}
