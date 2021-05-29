var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { css, customElement, html, LitElement, property } from 'lit-element';
/**
 * Renders the application.
 */
let KApp = class KApp extends LitElement {
    constructor() {
        super();
        this.enums = {};
        this.structs = {};
        this.data = [];
        this.resultCount = 0;
        this.totalResults = 0;
        this.noResults = false;
        this.game = 'mf';
        this.version = 'U';
        this.map = 'ram';
        this.fetchingData = false;
        this.query = '';
        this.generator = undefined;
        this.seenResults = [];
        this.parseSearchParams();
        this.fetchData();
        document.body.addEventListener('keyup', (e) => {
            if (e.key == 'Escape') {
                this.clearPreviousSearch(false);
            }
        });
    }
    parseSearchParams() {
        var _a;
        // check for game, version, and map in search params
        const params = new URLSearchParams(window.location.search);
        const game = params.get('game') || '';
        if (this.getGames().some(x => x.value === game)) {
            this.game = game;
        }
        const version = ((_a = params.get('version')) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || '';
        if (this.getVersions().includes(version)) {
            this.version = version;
        }
        const map = params.get('map') || '';
        if (this.getMaps().some(x => x.value === map)) {
            this.map = map;
        }
    }
    getVersionedData() {
        return this.data.filter((item) => this.version in item.addr);
    }
    getVersions() {
        return ['U', 'E', 'J'];
    }
    async fetchData() {
        if (!this.game || !this.version || !this.map) {
            return;
        }
        this.fetchingData = true;
        const targetBaseUrl = `/dev/json/${this.game}/`;
        this.enums = await fetch(targetBaseUrl + 'enums.json')
            .then(response => response.json());
        this.structs = await fetch(targetBaseUrl + 'structs.json')
            .then(response => response.json());
        this.data = await fetch(targetBaseUrl + `${this.map}.json`)
            .then(response => response.json());
        this.fetchingData = false;
    }
    inputHandler(e) {
        var _a;
        let ke = e;
        if (ke.key == 'Enter') {
            this.performSearch(((_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelector('input')).value || '', !ke.shiftKey);
        }
    }
    searchButtonHandler() {
        var _a;
        this.performSearch(((_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelector('input')).value || '');
    }
    findAllButtonHandler() {
        var _a;
        this.findAll(((_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelector('input')).value || '');
    }
    findAll(query, highlight = true) {
        var _a;
        this.clearPreviousSearch(false);
        const gen = this.search(query, this.getVersionedData(), []);
        let result = gen.next().value;
        let resultCount = 0;
        while (result) {
            resultCount++;
            if (highlight) {
                ((_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelector('k-table')).highlight(result, resultCount == 1);
            }
            result = gen.next().value;
        }
        if (highlight && resultCount) {
            this.resultCount = 1;
            this.totalResults = resultCount;
        }
        return resultCount;
    }
    clearPreviousSearch(clearInput = true) {
        if (clearInput) {
            this.shadowRoot.querySelector('input').value = '';
            this.resultCount = 0;
            this.totalResults = 0;
            this.seenResults = [];
        }
        this.noResults = false;
        this.shadowRoot.querySelector('k-table').clearHighlights();
    }
    collapseAll() {
        var _a;
        ((_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelector('k-table')).collapseAll();
    }
    async performSearch(query, forward = true) {
        var _a, _b, _c;
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
            ((_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelector('k-table')).highlight(result);
            await Promise.resolve();
            return;
        }
        if (this.resultCount < this.seenResults.length) {
            // forwards through already generated results
            this.resultCount++;
            let result = this.seenResults[this.resultCount - 1];
            ((_b = this.shadowRoot) === null || _b === void 0 ? void 0 : _b.querySelector('k-table')).highlight(result);
            await Promise.resolve();
            return;
        }
        const result = this.generator.next().value;
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
        ((_c = this.shadowRoot) === null || _c === void 0 ? void 0 : _c.querySelector('k-table')).highlight(result);
    }
    *search(query, data, rowStart) {
        for (let i = 0; i < data.length; i++) {
            let row = data[i];
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
                let searchable = row[thisKey];
                if (!searchable && ['params', 'return'].includes(thisKey)) {
                    searchable = 'void';
                }
                if (thisKey == 'params' && Array.isArray(row[(thisKey)])) {
                    // Params is actually an array, but we render it as
                    // a single cell, so go ahead and re-join it to
                    // search over the string.
                    searchable = searchable.join(',');
                }
                if ((thisKey == 'size' && typeof row[thisKey] == 'object') ||
                    (thisKey == 'count' && typeof row[thisKey] == 'object') ||
                    thisKey == 'addr') {
                    searchable =
                        searchable[this.version];
                }
                if (searchable.toLowerCase().indexOf(query.toLowerCase()) != -1) {
                    // This has the search term!
                    yield { row: rowStart, key: thisKey };
                }
                if (thisKey == 'desc' &&
                    ('enum' in row || row.type in this.structs)) {
                    let isEnum = 'enum' in row;
                    let expandName = isEnum ? row.enum : row.type;
                    if (isEnum) {
                        yield* this.search(query, this.enums[expandName], rowStart);
                    }
                    else {
                        yield* this.search(query, this.structs[expandName]
                            .vars, rowStart);
                    }
                }
            }
            rowStart.pop();
        }
    }
    getGames() {
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
    getMaps() {
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
    getRenderedResultsCount(resultCount, totalResults, noResults) {
        if (noResults) {
            // Render 0 of 0
            return resultCount + ' of ' + totalResults;
        }
        return resultCount ? resultCount + ' of ' + totalResults : '';
    }
    gameChangeHandler() {
        // mf, zm
        this.game =
            this.shadowRoot.querySelector('#game-select')
                .value;
        this.fetchData();
    }
    versionChangeHandler() {
        // U, E, J
        this.version =
            this.shadowRoot.querySelector('#version-select')
                .value;
    }
    mapChangeHandler() {
        // ram, code, sprite_ai, data
        this.map =
            this.shadowRoot.querySelector('#map-select')
                .value;
        this.fetchData();
    }
    // TODO: use css instead of nbsp
    render() {
        return html `
      <div>
        <h1>GBA Metroid Maps</h1>
        <div id="banner">
          <p>
            <select id="game-select" @change="${this.gameChangeHandler}">
              ${this.getGames().map(game => html `<option value="${game.value}" ?selected="${this.game == game.value}">${game.label}</option>`)}
            </select>
            <select id="map-select" @change="${this.mapChangeHandler}">
                ${this.getMaps().map(map => html `<option value="${map.value}" ?selected="${this.map == map.value}">${map.label}</option>`)}
            </select>
            <select id="version-select" @change="${this.versionChangeHandler}">
              ${this.getVersions().map(version => html `<option value="${version}" ?selected="${this.version == version}">${version}</option>`)}
            </select>
          </p>
          <p>
            Search:
            <label data-results="${this.getRenderedResultsCount(this.resultCount, this.totalResults, this.noResults)}">
              <input @keyup='${this.inputHandler}'/>
            </label>
            <button @click="${this.searchButtonHandler}">Find</button>
            <button @click="${this.findAllButtonHandler}">Find All</button>
            <button @click="${this.clearPreviousSearch}">Clear results</button>
            <button @click="${this.collapseAll}">Collapse All</button>
          </p>
        </div>
        ${!this.fetchingData ? html `
        <k-table id="first"
          .maptype="${this.map}"
          .version="${this.version}"
          .data="${this.data}"
          .structs="${this.structs}"
          .enums="${this.enums}">
        </k-table>
        ` :
            ''}
      </div>`;
    }
};
KApp.styles = css `
    :host {
      display: block;
      background-image: url("dev/background.png");
      color: white;
      font-family: verdana, sans-serif;
    }

    h1 {
      text-align: center;
      background: #202020;
      margin: 0;
    }

    #banner {
      background: #202020;
      margin: 0;
      padding: 20px 0;
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
      left: 115px;
      font-family: verdana, sans-serif;
      font-size: 12px;
      display: block;
      font-weight: bold;
    }
  `;
__decorate([
    property({ type: Object })
], KApp.prototype, "enums", void 0);
__decorate([
    property({ type: Object })
], KApp.prototype, "structs", void 0);
__decorate([
    property({ type: Array })
], KApp.prototype, "data", void 0);
__decorate([
    property({ type: Number })
], KApp.prototype, "resultCount", void 0);
__decorate([
    property({ type: Number })
], KApp.prototype, "totalResults", void 0);
__decorate([
    property({ type: Boolean })
], KApp.prototype, "noResults", void 0);
__decorate([
    property({ type: String })
], KApp.prototype, "game", void 0);
__decorate([
    property({ type: String })
], KApp.prototype, "version", void 0);
__decorate([
    property({ type: String })
], KApp.prototype, "map", void 0);
__decorate([
    property({ type: Boolean })
], KApp.prototype, "fetchingData", void 0);
KApp = __decorate([
    customElement('k-app')
], KApp);
export { KApp };
//# sourceMappingURL=k-app.js.map