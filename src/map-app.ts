import { css, customElement, html, LitElement, property } from 'lit-element';
import "./map-table";

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
      background: #202020;
      text-align: center;
      margin: 0;
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

    button,
    input,
    select {
      background: black;
      color: white;
    }

    input,
    label {
      position: relative;
      display: inline-block;
      box-sizing: border-box;
      width: 170px;
      /* 170 - 115 left position below */
      padding-right: 55px;
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
  `;

  @property({ type: Object }) enums: { [key: string]: unknown } = {};

  @property({ type: Object }) structs: { [key: string]: unknown } = {};

  @property({ type: Array }) data: Array<{ [key: string]: unknown }> = [];

  @property({ type: Number }) resultIndex = 0;

  @property({ type: Number }) resultCount = 0;

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
    if (this.resultIndex > 0) {
      this.clearPreviousSearch(true);
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
    let resultIndex = 0;
    while (result) {
      resultIndex++;
      if (highlight) {
        this.shadowRoot?.querySelector('map-table')!.highlight(
          result, resultIndex == 1);
      }
      result = gen.next().value;
    }
    if (highlight && resultIndex) {
      this.resultIndex = 1;
      this.resultCount = resultIndex;
    }
    return resultIndex;
  }

  private clearPreviousSearch(clearInput: boolean = true) {
    if (clearInput) {
      this.shadowRoot!.querySelector('input')!.value = '';
      this.resultIndex = 0;
      this.resultCount = 0;
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
      this.resultIndex = 0;
      this.resultCount = this.findAll(query, false);
      this.generator = this.search(query, this.getVersionedData(), []);
      this.seenResults = [];
    }
    if (!forward && this.seenResults.length && this.resultIndex > 0) {
      // go backwards to previous result
      this.resultIndex = this.resultIndex - 1;
      let result = this.seenResults[this.resultIndex - 1];
      this.shadowRoot?.querySelector('map-table')!.highlight(result);
      await Promise.resolve();
      return;
    }
    if (this.resultIndex < this.seenResults.length) {
      // forwards through already generated results
      this.resultIndex++;
      let result = this.seenResults[this.resultIndex - 1];
      this.shadowRoot?.querySelector('map-table')!.highlight(result);
      await Promise.resolve();
      return;
    }
    const result = this.generator!.next().value;
    if (!result) {
      // if there were never any results, note that
      if (!this.resultIndex) {
        this.noResults = true;
      }
      this.query = '';
      this.generator = undefined;
      this.resultIndex = 0;
      this.resultCount = 0;
      return;
    }
    // deep copies of objects with arrays
    let storage = Object.assign({}, result);
    storage.row = storage.row.slice();
    this.seenResults.push(storage);
    this.resultIndex = this.resultIndex + 1;
    // highlight that result
    this.shadowRoot?.querySelector('map-table')!.highlight(result);
  }

  *search(
    query: string, data: Array<{ [key: string]: unknown }>,
    rowStart: number[]): Generator<{ row: number[], key: string }> {
    for (let i = 0; i < data.length; i++) {
      let row = data[i] as { [key: string]: unknown };

      // get fields we want to search
      let keys = Object.keys(row);
      const toSearch = ['desc', 'addr', 'params', 'return'];
      keys = keys.filter(k => toSearch.includes(k));

      // get searchable string for each field's value
      rowStart.push(i);
      for (let j = 0; j < keys.length; j++) {
        const thisKey = keys[j];
        let searchable = row[thisKey] as string;
        switch (thisKey) {
          case 'params':
            if (row[thisKey] === null) {
              searchable = 'void';
            } else {
              let params = row[thisKey] as Array<{ [key: string]: unknown }>;
              searchable = params.map(p => p.desc).join(',');
            }
            break;
          case 'return':
            if (row[thisKey] === null) {
              searchable = 'void';
            } else {
              let ret = row[thisKey] as { [key: string]: unknown };
              searchable = ret.desc as string;
            }
            break;
          case 'addr':
            if (typeof row[thisKey] == 'object') {
              searchable = (row[thisKey] as { [key: string]: string })[this.version];
            }
            break;
        }

        // check if query is in the searchable string
        if (searchable.toLowerCase().indexOf(query.toLowerCase()) != -1) {
          // This has the search term!
          yield { row: rowStart, key: thisKey };
        }
      }

      // search enum or struct
      if ('enum' in row) {
        const name = row.enum as string;
        yield* this.search(
          query,
          this.enums[name] as Array<{ [key: string]: unknown }>,
          rowStart);
      } else if (row.type as string in this.structs) {
          const name = row.type as string;
          yield* this.search(
            query,
            (this.structs[name] as { [key: string]: unknown })
              .vars as Array<{ [key: string]: unknown }>,
            rowStart);
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
        label: 'ROM Data',
        value: 'data',
      },
    ];
  }

  private getRenderedResultsCount(
    resultIndex: number, resultCount: number, noResults: boolean) {
    if (noResults) {
      // Render 0 of 0
      return resultIndex + ' of ' + resultCount;
    }
    return resultIndex ? resultIndex + ' of ' + resultCount : ''
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
    // ram, code, data
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
              this.resultIndex, this.resultCount, this.noResults)}">
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
