var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { css, customElement, html, LitElement, property } from 'lit-element';
/**
 * Renders a single row in a table.
 */
let KRow = class KRow extends LitElement {
    constructor() {
        super(...arguments);
        /**
         * The JSON data to render.
         */
        this.data = {};
        this.structs = {};
        this.enums = {};
        this.version = '';
        this.odd = false;
        this.expanded = false;
        this.isEnum = false;
        this.parentAddress = '';
        this.maptype = '';
    }
    toHex(num) {
        return num.toString(16).toUpperCase();
    }
    getLength() {
        const size = this.getSize();
        const count = this.getCount();
        const length = size * count;
        return length;
    }
    async highlightCell(key, shouldScroll) {
        var _a;
        if (key == 'enum') {
            this.expanded = true;
        }
        await this.requestUpdate();
        let element = (_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelector('.' + key);
        if (shouldScroll) {
            // Account for the sticky header.
            const yOffset = -155;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
        element.classList.add('highlight');
    }
    async highlightSubTable(result, shouldScroll) {
        var _a;
        this.expanded = true;
        await this.requestUpdate();
        let table = (_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelector('k-table');
        table.highlight(result, shouldScroll);
    }
    clearHighlights() {
        var _a, _b;
        let highlights = Array.from((_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelectorAll('.highlight'));
        highlights.forEach(el => el.classList.remove('highlight'));
        if (this.expanded) {
            let table = (_b = this.shadowRoot) === null || _b === void 0 ? void 0 : _b.querySelector('k-table');
            table.clearHighlights();
        }
    }
    collapseAll() {
        var _a;
        if (this.expanded) {
            let table = (_a = this.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelector('k-table');
            table.collapseAll();
        }
        this.expanded = false;
    }
    getCount() {
        return 'count' in this.data ? parseInt(this.data.count, 16) : 1;
    }
    getSize() {
        let size;
        if (this.data.size) {
            if (typeof size == 'object') {
                size = size[this.version];
            }
            size = parseInt(this.data.size, 16);
        }
        else {
            let type = this.data.type.split('.')[0];
            switch (type) {
                case 'u8':
                case 's8':
                case 'flags8':
                    size = 1;
                    break;
                case 'u16':
                case 's16':
                case 'flags16':
                    size = 2;
                    break;
                case 'u32':
                case 's32':
                case 'ptr':
                    size = 4;
                    break;
                case 'palette':
                    size = 32;
                    break;
                default:
                    size = parseInt(this.structs[type].size, 16);
                    break;
            }
        }
        return size;
    }
    getTooltip() {
        if (['code', 'sprite_ai'].includes(this.maptype)) {
            return `Ends at ${this.toHex(parseInt(this.getAddress(), 16) + this.getLength() - 1)}`;
        }
        if (this.version) {
            const count = this.getCount();
            if (count > 1) {
                const size = this.getSize();
                return 'Size: ' + this.toHex(size) + '\nCount: ' + this.toHex(count);
            }
            return '';
        }
        else {
            return 'Address: ' + this.getOffsetAddress();
        }
    }
    getOffsetAddress() {
        let off = parseInt(this.data.offset, 16);
        return this.toHex(parseInt(this.parentAddress, 16) + off);
    }
    showToggle() {
        return (this.isExpandEnum() || this.data.type in this.structs);
    }
    expand() {
        this.expanded = !this.expanded;
    }
    isExpandEnum() {
        return 'enum' in this.data;
    }
    getExpandName() {
        return this.isExpandEnum() ? this.data.enum :
            this.data.type;
    }
    getData() {
        if (this.isExpandEnum()) {
            return this.enums[this.getExpandName()];
        }
        return this.structs[this.getExpandName()]
            .vars;
    }
    getAddress() {
        if (this.version) {
            return this.data.addr[this.version];
        }
        return this.data.offset;
    }
    shouldAddrHaveToolTip() {
        return !this.version;
    }
    getFirstClass(data) {
        if (data.val) {
            return 'val';
        }
        else if (data.addr) {
            return 'addr';
        }
        return 'offset';
    }
    render() {
        return this.isEnum ?
            html `
      <div class="${this.getFirstClass(this.data)}">${this.data.val}</div>
      <div class="desc">${this.data.desc}</div>` :
            html `
      <div class="${this.getFirstClass(this.data)}">
        <span class="${this.shouldAddrHaveToolTip() ? 'has-tooltip' : ''}"
              title="${this.shouldAddrHaveToolTip() ? this.getTooltip() :
                ''}">${this.getAddress()}</span>
      </div>
      <div class="size">
        <span class="${this.version && !!this.getTooltip() ? 'has-tooltip' : ''}"
              title="${this.getTooltip()}">${this.toHex(this.getLength())}</span>
      </div>
      <div class="desc">${this.data.desc} ${this.showToggle() ?
                html `<span class="expand" @click="${this.expand}">[${this.expanded ? '-' : '+'}]</span>` :
                ''}
          ${this.expanded ? html `<k-table
              .data="${this.getData()}"
              ?isEnum="${this.isExpandEnum()}"
              .structs="${this.structs}"
              .enums="${this.enums}"
              .parentAddress="${this.version ? this.getAddress() :
                this.getOffsetAddress()}">
            </k-table>` :
                ''}
      </div>
      ${['code', 'sprite_ai'].includes(this.maptype) ?
                html `
      <div class="params">
        <span>
          ${this.data.params ?
                    this.data.params
                        .map((param, index) => `${index < 4 ?
                        `r${index}` :
                        `sp[${((index - 4) * 4).toString(16).toUpperCase()}]`}: ${param}`)
                        .map((s) => html `<p class="param">${s}</p>`) :
                    'void'}
        </span>
      </div>
      <div class="return">
        <span>
          ${this.data.return || 'void'}
        </span>
      </div>` :
                ''}
    `;
    }
};
KRow.styles = css `
    :host {
      background: #202020;
      border: 1px solid #808080;
      display: flex;

      --k-blue: #2196F3;
      --k-gray: #202020;
      --k-black: #999999;
    }

    :host([odd]) {
      background: #101010;
    }

    div:not(:last-child) {
      border-right: 1px solid var(--k-black);
    }

    div {
      box-sizing: border-box;
      display: inline-block;
      overflow: hidden;
      padding: 3px;
      text-overflow: ellipsis;
    }

    div,
    span {
      transition: background-color .5s linear;
    }

    .size {
      flex: none;
      text-align: right;
      width: 5em;
    }

    .addr {
      flex: none;
      font-family: "Courier New", monospace;
      width: 7em;
    }

    .addr,
    .offset {
      text-align: right;
    }

    .val,
    .offset {
      width: 5.5em;
    }

    .has-tooltip {
      border-bottom: 1px dotted white;
      cursor: help;
    }

    .expand {
      color: var(--k-blue);
      cursor: pointer;
    }

    .highlight {
      background-color: lightblue;
    }

    .desc,
    .params,
    .return {
      flex: 1;
    }

    .param {
      margin: 0;
    }
  `;
__decorate([
    property({ type: Object })
], KRow.prototype, "data", void 0);
__decorate([
    property({ type: Object })
], KRow.prototype, "structs", void 0);
__decorate([
    property({ type: Object })
], KRow.prototype, "enums", void 0);
__decorate([
    property({ type: String })
], KRow.prototype, "version", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], KRow.prototype, "odd", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], KRow.prototype, "expanded", void 0);
__decorate([
    property({ type: Boolean })
], KRow.prototype, "isEnum", void 0);
__decorate([
    property({ type: String })
], KRow.prototype, "parentAddress", void 0);
__decorate([
    property({ type: String })
], KRow.prototype, "maptype", void 0);
KRow = __decorate([
    customElement('k-row')
], KRow);
export { KRow };
//# sourceMappingURL=k-row.js.map