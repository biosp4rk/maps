var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { css, customElement, html, LitElement, property } from 'lit-element';
/**
 * Renders a table.
 */
let KTable = class KTable extends LitElement {
    constructor() {
        super(...arguments);
        /**
         * The JSON data to render.
         */
        this.data = [];
        this.structs = {};
        this.enums = {};
        this.version = '';
        this.isEnum = false;
        this.parentAddress = '';
        this.sortAscending = true;
        this.sortedHeading = '';
        this.maptype = '';
    }
    firstUpdated() {
        const headings = this.getHeadings(this.maptype);
        this.sortedHeading = headings[0];
    }
    getVersionedData(version) {
        return this.data.filter((item) => version in item.addr);
    }
    getClasses() {
        if (this.version) {
            let classes = ['addr', 'size', 'desc'];
            if (['code', 'sprite_ai'].includes(this.maptype)) {
                classes.push('params', 'return');
            }
            return classes;
        }
        if (this.isEnum) {
            return ['val', 'desc'];
        }
        return ['offset', 'size', 'desc'];
    }
    highlight(result, shouldScroll = true) {
        var _a;
        if (!result) {
            return;
        }
        let rowElement = (_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelectorAll('k-row')[result.row[0]];
        if (result.row.length == 1) {
            rowElement.highlightCell(result.key, shouldScroll);
        }
        else {
            rowElement.highlightSubTable({ row: result.row.slice(1), key: result.key }, shouldScroll);
        }
    }
    clearHighlights() {
        var _a;
        let rows = Array.from((_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelectorAll('k-row'));
        rows.forEach(row => row.clearHighlights());
    }
    collapseAll() {
        var _a;
        let rows = Array.from((_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelectorAll('k-row'));
        rows.forEach(row => row.collapseAll());
    }
    getHeadings(mapType) {
        if (this.version) {
            let headings = ['Address', 'Length', 'Description'];
            if (['code', 'sprite_ai'].includes(mapType)) {
                headings.push('Arguments', 'Returns');
            }
            return headings;
        }
        if (this.isEnum) {
            return ['Value', 'Description'];
        }
        else {
            return ['Offset', 'Size', 'Description'];
        }
    }
    getData(sortFn) {
        const data = this.version ? this.getVersionedData(this.version) : this.data;
        if (sortFn) {
            let sortedData = data.slice();
            sortedData.sort(sortFn);
            return sortedData;
        }
        else {
            return data;
        }
    }
    maybeSort(e) {
        var _a, _b, _c;
        const columnHeadings = ['Address', 'Value', 'Offset', 'Description'];
        const columnKeys = ['addr', 'val', 'offset', 'desc'];
        const labelEl = (_a = e.target.parentElement) === null || _a === void 0 ? void 0 : _a.querySelector('.label');
        const sortEl = (_b = e.target.parentElement) === null || _b === void 0 ? void 0 : _b.querySelector('.sort');
        // Are we sorting by increasing or decreasing?
        if ((_c = sortEl.textContent) === null || _c === void 0 ? void 0 : _c.trim()) {
            // Previously sorted, flip direction.
            this.sortAscending = !this.sortAscending;
        }
        if (columnHeadings.includes(labelEl.innerText.trim())) {
            this.sortedHeading = labelEl.innerText.trim();
            let keyIndex = columnHeadings.indexOf(labelEl.innerText.trim());
            let key = columnKeys[keyIndex];
            this.sortFn =
                (a, b) => {
                    if (key == 'addr' || key == 'offset' || key == 'val') {
                        if (parseInt(a[key][this.version], 16) <
                            parseInt(b[key][this.version], 16)) {
                            return this.sortAscending ? -1 : 1;
                        }
                        else if (parseInt(a[key][this.version], 16) >
                            parseInt(b[key][this.version], 16)) {
                            return this.sortAscending ? 1 : -1;
                        }
                        else {
                            return 0;
                        }
                    }
                    else {
                        if (a[key] < b[key]) {
                            return this.sortAscending ? -1 : 1;
                        }
                        else if (a[key] > b[key]) {
                            return this.sortAscending ? 1 : -1;
                        }
                        else {
                            return 0;
                        }
                    }
                };
        }
        else {
            this.sortedHeading = '';
            this.sortFn = undefined;
        }
    }
    render() {
        return html `
      <div id="table">
        <div id="heading-row">
          ${this.getHeadings(this.maptype)
            .map((heading, index) => html `
              <span class="heading ${this.getClasses()[index]}"
                    @click="${this.maybeSort}">
                <span class="label">
                  ${heading}
                </span>
                <span class="sort">
                  ${(this.sortedHeading == heading) ? html `&#x25BE;` : html ``}
                </span>
              </span>`)}
        </div>
        <div>
          ${this.getData(this.sortFn)
            .map((item, index) => {
            return html `<k-row
                  .maptype="${this.maptype}"
                  .data="${item}"
                  .structs="${this.structs}"
                  .enums="${this.enums}"
                  .version="${this.version}"
                  ?odd="${index % 2 == 0}"
                  ?isEnum="${this.isEnum}"
                  .parentAddress="${this.parentAddress}">
                  </k-row>`;
        })}
        </div>
      </div>
    `;
    }
};
KTable.styles = css `
    :host {
      display: block;
    }

    .heading {
      box-sizing: border-box;
      cursor: pointer;
      display: inline-block;
      font-weight: 700;
      overflow: hidden;
      padding: 3px;
      text-overflow: ellipsis;
      vertical-align: top;
    }

    .size {
      width: 5em;
    }

    .val,
    .offset {
      width: 5.5em;
    }

    .addr {
      width: 7em;
    }

    #table {
      margin: auto;
      max-width: 800px;
    }

    #heading-row {
      display: flex;
    }

    :host(#first) #heading-row {
      background: #202020;
      border-bottom: 1px solid #808080;
      display: flex;
      margin-left: calc((100vw - 800px) * -1);
      margin-right: calc((100vw - 800px) * -1);
      padding-right: calc(100vw - 800px);
      padding-left: calc(100vw - 800px);
      position: sticky;
      top: 128px;
    }

    .desc,
    .params,
    .return {
      flex: 1;
    }

    .sort {
      display: inline-block;
    }

    :host([sortascending]) .sort {
      transform: rotate(180deg);
    }
  `;
__decorate([
    property({ type: Array })
], KTable.prototype, "data", void 0);
__decorate([
    property({ type: Object })
], KTable.prototype, "structs", void 0);
__decorate([
    property({ type: Object })
], KTable.prototype, "enums", void 0);
__decorate([
    property({ type: String, reflect: true })
], KTable.prototype, "version", void 0);
__decorate([
    property({ type: Boolean })
], KTable.prototype, "isEnum", void 0);
__decorate([
    property({ type: String })
], KTable.prototype, "parentAddress", void 0);
__decorate([
    property({ type: Function })
], KTable.prototype, "sortFn", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], KTable.prototype, "sortAscending", void 0);
__decorate([
    property({ type: String })
], KTable.prototype, "sortedHeading", void 0);
__decorate([
    property({ type: String })
], KTable.prototype, "maptype", void 0);
KTable = __decorate([
    customElement('k-table')
], KTable);
export { KTable };
//# sourceMappingURL=k-table.js.map